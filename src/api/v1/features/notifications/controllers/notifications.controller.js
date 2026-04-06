const { requireOrgId } = require("../../../../../shared/helpers/auth.helper");
const notificationsService = require("../services/notifications.service");
const notificationsRepository = require("../repositories/notifications.repository");
const whatsappDigestJob = require("../../../../../scheduler/jobs/whatsapp-digest.job");

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

  sendTestMessage = async (req, res, next) => {
    try {
      const orgId = requireOrgId(req, res);
      if (!orgId) return;

      const result = await notificationsService.sendTestMessage(orgId);
      res.status(200).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  };

  broadcast = async (req, res, next) => {
    try {
      const orgId = requireOrgId(req, res);
      if (!orgId) return;

      const { message, filter } = req.body;
      const result = await notificationsService.broadcastMessage(orgId, { message, filter });
      res.status(200).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  };

  runDigest = async (req, res, next) => {
    try {
      await whatsappDigestJob.run();
      res.status(200).json({ success: true, message: "Digest job completed." });
    } catch (error) {
      next(error);
    }
  };

  sendWelcomeTest = async (req, res, next) => {
    try {
      const orgId = requireOrgId(req, res);
      if (!orgId) return;
      const { phone } = req.body;
      const data = await notificationsService.sendWelcomeTest(orgId, phone);
      res.status(200).json({ success: true, data });
    } catch (error) {
      next(error);
    }
  };

  getWelcomeStatus = async (req, res, next) => {
    try {
      const orgId = requireOrgId(req, res);
      if (!orgId) return;

      const data = await notificationsService.getWelcomeStatus(orgId);
      res.status(200).json({ success: true, data });
    } catch (error) {
      next(error);
    }
  };

  sendWelcomeToAll = async (req, res, next) => {
    try {
      const orgId = requireOrgId(req, res);
      if (!orgId) return;

      const result = await notificationsService.sendWelcomeToAll(orgId);
      res.status(200).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  };

  getDefaultWelcomeMessage = async (req, res, next) => {
    try {
      const data = notificationsService.getDefaultWelcomeMessage();
      res.status(200).json({ success: true, data });
    } catch (error) {
      next(error);
    }
  };
}

module.exports = new NotificationsController();
