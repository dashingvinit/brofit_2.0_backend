const { requireOrgId } = require("../../../../../shared/helpers/auth.helper");
const expenseService = require("../services/expense.service");

class ExpenseController {
  constructor() {
    this.getExpenses = this.getExpenses.bind(this);
    this.createExpense = this.createExpense.bind(this);
    this.updateExpense = this.updateExpense.bind(this);
    this.deleteExpense = this.deleteExpense.bind(this);
  }

  async getExpenses(req, res, next) {
    try {
      const orgId = requireOrgId(req, res);
      if (!orgId) return;

      const { month } = req.query;
      const data = await expenseService.getExpenses(orgId, { month });

      res.status(200).json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  async createExpense(req, res, next) {
    try {
      const orgId = requireOrgId(req, res);
      if (!orgId) return;

      const { amount, category, description, date } = req.body;
      if (!amount || !date) {
        return res.status(400).json({ success: false, message: "amount and date are required" });
      }

      const expense = await expenseService.createExpense(orgId, { amount, category, description, date });
      res.status(201).json({ success: true, data: expense });
    } catch (error) {
      next(error);
    }
  }

  async updateExpense(req, res, next) {
    try {
      const orgId = requireOrgId(req, res);
      if (!orgId) return;

      const { id } = req.params;
      const expense = await expenseService.updateExpense(id, orgId, req.body);
      res.status(200).json({ success: true, data: expense });
    } catch (error) {
      next(error);
    }
  }

  async deleteExpense(req, res, next) {
    try {
      const orgId = requireOrgId(req, res);
      if (!orgId) return;

      const { id } = req.params;
      await expenseService.deleteExpense(id, orgId);
      res.status(200).json({ success: true, message: "Expense deleted" });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new ExpenseController();
