const cron = require("node-cron");
const expireAndSnapshotJob = require("./jobs/expire-and-snapshot.job");
const whatsappDigestJob = require("./jobs/whatsapp-digest.job");

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

  // Daily at 7:00 AM IST (1:30 AM UTC) — send WhatsApp digest to gym owners
  cron.schedule(
    "30 1 * * *",
    async () => {
      console.log(
        `\n⏰ [Cron] Running WhatsApp digest at ${new Date().toISOString()}`,
      );
      await whatsappDigestJob.run();
    },
    { timezone: "UTC" },
  );

  console.log("📅 Scheduler started — expire-snapshot at 01:00 UTC, WhatsApp digest at 01:30 UTC (07:00 IST)");
}

module.exports = { startScheduler };
