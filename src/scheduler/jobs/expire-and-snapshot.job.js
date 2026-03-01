const reportsService = require("../../api/v1/features/reports/services/reports.service");
const reportsRepository = require("../../api/v1/features/reports/repositories/reports.repository");

const run = async () => {
  let orgIds;
  try {
    orgIds = await reportsRepository.getAllOrgIds();
  } catch (err) {
    console.error("[Cron] Failed to fetch org IDs:", err.message);
    return;
  }

  if (orgIds.length === 0) {
    console.log("[Cron] No organizations found — skipping.");
    return;
  }

  console.log(`[Cron] Processing ${orgIds.length} organization(s)...`);

  for (const orgId of orgIds) {
    try {
      // 1. Expire stale subs + deactivate inactive members
      const expireResult = await reportsService.expireSubscriptions(orgId);

      // 2. Record daily activity snapshot
      await reportsService.takeActivitySnapshot(orgId, expireResult);

      console.log(
        `[Cron] ✓ ${orgId} — expired memberships: ${expireResult.expiredMemberships}, trainings: ${expireResult.expiredTrainings}, deactivated members: ${expireResult.deactivatedMembers}`,
      );
    } catch (err) {
      console.error(`[Cron] ✗ Org ${orgId} failed:`, err.message);
    }
  }

  console.log("[Cron] Daily job complete.\n");
};

module.exports = { run };
