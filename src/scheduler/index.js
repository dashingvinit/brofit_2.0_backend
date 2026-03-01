const cron = require("node-cron");
const expireAndSnapshotJob = require("./jobs/expire-and-snapshot.job");

function startScheduler() {
  // Daily at 1:00 AM UTC — expire stale subscriptions and record member activity snapshot
  cron.schedule(
    "0 1 * * *",
    async () => {
      console.log(
        `\n⏰ [Cron] Running daily expire-and-snapshot at ${new Date().toISOString()}`,
      );
      await expireAndSnapshotJob.run();
    },
    { timezone: "UTC" },
  );

  console.log("📅 Scheduler started — daily job at 01:00 UTC");
}

module.exports = { startScheduler };
