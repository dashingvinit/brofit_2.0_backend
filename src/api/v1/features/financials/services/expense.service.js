const expenseRepository = require("../repositories/expense.repository");
const { createError } = require("../../../../../shared/helpers/subscription.helper");
const cache = require("../../../../../shared/helpers/cache.helper");

class ExpenseService {
  async createExpense(orgId, { amount, category, description, date }) {
    const result = await expenseRepository.create({
      orgId,
      amount: parseFloat(amount),
      category,
      description: description || null,
      date: new Date(date),
    });
    cache.invalidate(`financials:${orgId}`);
    return result;
  }

  async getExpenses(orgId, { month } = {}) {
    let from, to;
    if (month) {
      const [year, mon] = month.split("-").map(Number);
      from = new Date(year, mon - 1, 1);
      to = new Date(year, mon, 0);
    }
    return expenseRepository.findMany(orgId, { from, to });
  }

  async updateExpense(id, orgId, data) {
    const existing = await expenseRepository.findOne(id, orgId);
    if (!existing) throw createError("Expense not found", 404);

    const updates = {};
    if (data.amount !== undefined) updates.amount = parseFloat(data.amount);
    if (data.category !== undefined) updates.category = data.category;
    if (data.description !== undefined) updates.description = data.description;
    if (data.date !== undefined) updates.date = new Date(data.date);
    await expenseRepository.update(id, orgId, updates);
    cache.invalidate(`financials:${orgId}`);
    return expenseRepository.findOne(id, orgId);
  }

  async deleteExpense(id, orgId) {
    const existing = await expenseRepository.findOne(id, orgId);
    if (!existing) throw createError("Expense not found", 404);
    await expenseRepository.delete(id, orgId);
    cache.invalidate(`financials:${orgId}`);
  }
}

module.exports = new ExpenseService();
