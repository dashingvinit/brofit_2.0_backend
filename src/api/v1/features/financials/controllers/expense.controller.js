const { requireOrgId } = require("../../../../../shared/helpers/auth.helper");
const expenseService = require("../services/expense.service");

class ExpenseController {
  getExpenses = async (req, res, next) => {
    try {
      const orgId = requireOrgId(req, res);
      if (!orgId) return;

      const { month } = req.query;
      const data = await expenseService.getExpenses(orgId, { month });

      res.status(200).json({ success: true, data });
    } catch (error) {
      next(error);
    }
  };

  createExpense = async (req, res, next) => {
    try {
      const orgId = requireOrgId(req, res);
      if (!orgId) return;

      const { amount, category, description, date } = req.body;

      if (amount == null || !date) {
        return res.status(400).json({ success: false, message: "amount and date are required" });
      }
      if (parseFloat(amount) <= 0) {
        return res.status(400).json({ success: false, message: "amount must be greater than 0" });
      }
      if (category && !expenseService.VALID_CATEGORIES.includes(category)) {
        return res.status(400).json({ success: false, message: `category must be one of: ${expenseService.VALID_CATEGORIES.join(", ")}` });
      }

      const expense = await expenseService.createExpense(orgId, { amount, category, description, date });
      res.status(201).json({ success: true, data: expense });
    } catch (error) {
      next(error);
    }
  };

  updateExpense = async (req, res, next) => {
    try {
      const orgId = requireOrgId(req, res);
      if (!orgId) return;

      const { id } = req.params;
      const { amount, category } = req.body;

      if (amount !== undefined && parseFloat(amount) <= 0) {
        return res.status(400).json({ success: false, message: "amount must be greater than 0" });
      }
      if (category !== undefined && !expenseService.VALID_CATEGORIES.includes(category)) {
        return res.status(400).json({ success: false, message: `category must be one of: ${expenseService.VALID_CATEGORIES.join(", ")}` });
      }

      const expense = await expenseService.updateExpense(id, orgId, req.body);
      res.status(200).json({ success: true, data: expense });
    } catch (error) {
      next(error);
    }
  };

  deleteExpense = async (req, res, next) => {
    try {
      const orgId = requireOrgId(req, res);
      if (!orgId) return;

      const { id } = req.params;
      await expenseService.deleteExpense(id, orgId);
      res.status(200).json({ success: true, message: "Expense deleted" });
    } catch (error) {
      next(error);
    }
  };
}

module.exports = new ExpenseController();
