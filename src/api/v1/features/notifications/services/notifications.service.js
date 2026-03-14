const notificationsRepository = require("../repositories/notifications.repository");

class NotificationsService {
  async getSettings(orgId) {
    const settings = await notificationsRepository.getSettings(orgId);
    return settings ?? {
      orgId,
      ownerWhatsapp: null,
      digestEnabled: false,
      memberReminderEnabled: false,
      reminderDaysBefore: 3,
    };
  }

  async updateSettings(orgId, data) {
    const allowed = [
      "ownerWhatsapp",
      "digestEnabled",
      "memberReminderEnabled",
      "reminderDaysBefore",
    ];
    const filtered = Object.fromEntries(
      Object.entries(data).filter(([k]) => allowed.includes(k))
    );
    return notificationsRepository.upsertSettings(orgId, filtered);
  }
}

module.exports = new NotificationsService();
