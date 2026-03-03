const { requireOrgId } = require("../../../../../shared/helpers/auth.helper");
const investmentService = require("../services/investment.service");

class InvestmentController {
  getInvestments = async (req, res, next) => {
    try {
      const orgId = requireOrgId(req, res);
      if (!orgId) return;

      const data = await investmentService.getInvestments(orgId);
      res.status(200).json({ success: true, data });
    } catch (error) {
      next(error);
    }
  };

  createInvestment = async (req, res, next) => {
    try {
      const orgId = requireOrgId(req, res);
      if (!orgId) return;

      const { name, amount, date, notes } = req.body;
      if (!name || !amount || !date) {
        return res.status(400).json({ success: false, message: "name, amount and date are required" });
      }

      const investment = await investmentService.createInvestment(orgId, { name, amount, date, notes });
      res.status(201).json({ success: true, data: investment });
    } catch (error) {
      next(error);
    }
  };

  updateInvestment = async (req, res, next) => {
    try {
      const orgId = requireOrgId(req, res);
      if (!orgId) return;

      const { id } = req.params;
      const investment = await investmentService.updateInvestment(id, orgId, req.body);
      res.status(200).json({ success: true, data: investment });
    } catch (error) {
      next(error);
    }
  };

  deleteInvestment = async (req, res, next) => {
    try {
      const orgId = requireOrgId(req, res);
      if (!orgId) return;

      const { id } = req.params;
      await investmentService.deleteInvestment(id, orgId);
      res.status(200).json({ success: true, message: "Investment deleted" });
    } catch (error) {
      next(error);
    }
  };
}

module.exports = new InvestmentController();
