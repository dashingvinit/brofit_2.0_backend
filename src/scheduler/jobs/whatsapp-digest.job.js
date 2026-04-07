const { getTwilioClient, formatPhone } = require("../../shared/services/whatsapp.service");
const config = require("../../config/env.config");
const notificationsRepository = require("../../api/v1/features/notifications/repositories/notifications.repository");
const reportsRepository = require("../../api/v1/features/reports/repositories/reports.repository");
const { prisma } = require("../../config/prisma.config");
const { startOfDay } = require("../../shared/helpers/subscription.helper");

function buildDigestMessage(orgName, expiringSoon, expiredRecently, pendingDues) {
  const lines = [];
  lines.push(`📊 *Daily Digest — ${orgName}*`);
  lines.push(`🗓 ${new Date().toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}`);
  lines.push("");

  if (expiringSoon.length > 0) {
    lines.push(`⚠️ *Expiring Soon (next 7 days)* — ${expiringSoon.length} member(s)`);
    expiringSoon.forEach((m) => {
      const name = `${m.member.firstName} ${m.member.lastName}`;
      const date = new Date(m.endDate).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
      lines.push(`  • ${name} — expires ${date}`);
    });
    lines.push("");
  } else {
    lines.push("✅ No memberships expiring in the next 7 days.");
    lines.push("");
  }

  if (expiredRecently.length > 0) {
    lines.push(`🔴 *Expired This Week* — ${expiredRecently.length} member(s)`);
    expiredRecently.forEach((m) => {
      const name = `${m.member.firstName} ${m.member.lastName}`;
      const date = new Date(m.endDate).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
      lines.push(`  • ${name} — expired ${date}`);
    });
    lines.push("");
  }

  if (pendingDues.length > 0) {
    lines.push(`💸 *Pending Dues* — ${pendingDues.length} payment(s)`);
    const seen = new Set();
    pendingDues.forEach((p) => {
      if (!seen.has(p.memberId)) {
        seen.add(p.memberId);
        const name = `${p.member.firstName} ${p.member.lastName}`;
        lines.push(`  • ${name} — ₹${p.amount.toLocaleString("en-IN")}`);
      }
    });
    lines.push("");
  }

  lines.push("_Powered by Brofit 2.0_");
  return lines.join("\n");
}

async function sendMemberReminder(client, fromNumber, member, membership, daysBefore) {
  const date = new Date(membership.endDate).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
  const planName = membership.planVariant?.planType?.name ?? "membership";

  const body =
    `Hi ${member.firstName}! 👋\n\n` +
    `Your *${planName}* expires in *${daysBefore} day(s)* (${date}).\n\n` +
    `Please contact us to renew and continue uninterrupted access.\n\n` +
    `_Brofit 2.0_`;

  await client.messages.create({
    from: fromNumber,
    to: `whatsapp:${formatPhone(member.phone)}`,
    body,
  });
}

async function sendDuesReminder(client, fromNumber, payment) {
  const name = `${payment.member.firstName} ${payment.member.lastName}`;
  const amount = payment.amount.toLocaleString("en-IN");

  const body =
    `Hi ${payment.member.firstName}! 👋\n\n` +
    `This is a friendly reminder that you have a pending payment of *₹${amount}* with us.\n\n` +
    `Please clear your dues at the earliest to avoid any inconvenience.\n\n` +
    `_Brofit 2.0_`;

  await client.messages.create({
    from: fromNumber,
    to: `whatsapp:${formatPhone(payment.member.phone)}`,
    body,
  });

  console.log(`[WhatsApp] ✓ Dues reminder sent to ${name}`);
}

const run = async () => {
  const client = getTwilioClient();
  if (!client) {
    console.log("[WhatsApp] Twilio not configured — skipping digest.");
    return;
  }

  const fromNumber = config.twilio.whatsappFrom;

  let orgIds;
  try {
    orgIds = await reportsRepository.getAllOrgIds();
  } catch (err) {
    console.error("[WhatsApp] Failed to fetch org IDs:", err.message);
    return;
  }

  for (const orgId of orgIds) {
    try {
      const settings = await notificationsRepository.getSettings(orgId);
      if (!settings) continue;

      const orgResult = await prisma.organization.findUnique({
        where: { id: orgId },
        select: { name: true },
      });
      const orgName = orgResult?.name ?? orgId;

      // --- Owner daily digest ---
      if (settings.digestEnabled && settings.ownerWhatsapp) {
        const [expiringSoon, expiredRecently, pendingDues] = await Promise.all([
          notificationsRepository.getMembersExpiringSoon(orgId, 7),
          notificationsRepository.getMembersExpiredRecently(orgId, 7),
          notificationsRepository.getMembersWithPendingDues(orgId, 7),
        ]);

        const message = buildDigestMessage(orgName, expiringSoon, expiredRecently, pendingDues);

        await client.messages.create({
          from: fromNumber,
          to: `whatsapp:${formatPhone(settings.ownerWhatsapp)}`,
          body: message,
        });

        console.log(`[WhatsApp] ✓ Digest sent to owner of org ${orgId}`);
      }

      // --- Member renewal reminders ---
      if (settings.memberReminderEnabled) {
        const days = settings.reminderDaysBefore ?? 3;
        const expiring = await notificationsRepository.getMembersExpiringSoon(orgId, days);

        // Only remind members expiring on exactly the target day
        const targetDate = new Date();
        targetDate.setDate(targetDate.getDate() + days);
        const start = startOfDay(targetDate);
        const end = new Date(targetDate); end.setHours(23, 59, 59, 999);

        const toRemind = expiring.filter(
          (m) => new Date(m.endDate) >= start && new Date(m.endDate) <= end
        );

        for (const membership of toRemind) {
          if (!membership.member.whatsappOptedIn) {
            console.log(`[WhatsApp] Skipping reminder — ${membership.member.firstName} has not opted in.`);
            continue;
          }
          try {
            await sendMemberReminder(client, fromNumber, membership.member, membership, days);
            console.log(`[WhatsApp] ✓ Reminder sent to ${membership.member.firstName} (org ${orgId})`);
          } catch (err) {
            console.error(`[WhatsApp] ✗ Reminder failed for member ${membership.memberId}:`, err.message);
          }
        }
      }

      // --- Dues reminders to members ---
      if (settings.duesReminderEnabled) {
        const daysOld = settings.duesReminderDaysOld ?? 7;
        const pendingPayments = await notificationsRepository.getMembersWithPendingDues(orgId, daysOld);

        // Deduplicate: one reminder per member per run
        const seen = new Set();
        for (const payment of pendingPayments) {
          if (!payment.member.phone || seen.has(payment.memberId)) continue;
          seen.add(payment.memberId);
          if (!payment.member.whatsappOptedIn) {
            console.log(`[WhatsApp] Skipping dues reminder — ${payment.member.firstName} has not opted in.`);
            continue;
          }
          try {
            await sendDuesReminder(client, fromNumber, payment);
          } catch (err) {
            console.error(`[WhatsApp] ✗ Dues reminder failed for member ${payment.memberId}:`, err.message);
          }
        }
      }
    } catch (err) {
      console.error(`[WhatsApp] ✗ Org ${orgId} failed:`, err.message);
    }
  }

  console.log("[WhatsApp] Digest job complete.\n");
};

module.exports = { run };
