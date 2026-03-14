const { requireOrgId } = require("../../../../../shared/helpers/auth.helper");
const notificationsService = require("../services/notifications.service");
const notificationsRepository = require("../repositories/notifications.repository");

class NotificationsController {
  getSettings = async (req, res, next) => {
    try {
      const orgId = requireOrgId(req, res);
      if (!orgId) return;

      const data = await notificationsService.getSettings(orgId);
      res.status(200).json({ success: true, data });
    } catch (error) {
      next(error);
    }
  };

  updateSettings = async (req, res, next) => {
    try {
      const orgId = requireOrgId(req, res);
      if (!orgId) return;

      const data = await notificationsService.updateSettings(orgId, req.body);
      res.status(200).json({ success: true, data });
    } catch (error) {
      next(error);
    }
  };

  getInbox = async (req, res, next) => {
    try {
      const orgId = requireOrgId(req, res);
      if (!orgId) return;

      const [expiringSoon, expiredRecently, pendingDues] = await Promise.all([
        notificationsRepository.getMembersExpiringSoon(orgId, 7),
        notificationsRepository.getMembersExpiredRecently(orgId, 7),
        notificationsRepository.getMembersWithPendingDues(orgId, 7),
      ]);

      res.status(200).json({
        success: true,
        data: { expiringSoon, expiredRecently, pendingDues },
      });
    } catch (error) {
      next(error);
    }
  };
}

module.exports = new NotificationsController();
