const expenseRepository = require("../repositories/expense.repository");

class ExpenseService {
  async createExpense(orgId, { amount, category, description, date }) {
    return expenseRepository.create({
      orgId,
      amount: parseFloat(amount),
      category,
      description: description || null,
      date: new Date(date),
    });
  }

  async getExpenses(orgId, { month } = {}) {
    let from, to;
    if (month) {
      // month = "YYYY-MM"
      const [year, mon] = month.split("-").map(Number);
      from = new Date(year, mon - 1, 1);
      to = new Date(year, mon, 0); // last day of month
    }
    return expenseRepository.findMany(orgId, { from, to });
  }

  async updateExpense(id, orgId, data) {
    const existing = await expenseRepository.findOne(id, orgId);
    if (!existing) {
      const err = new Error("Expense not found");
      err.status = 404;
      throw err;
    }
    const updates = {};
    if (data.amount !== undefined) updates.amount = parseFloat(data.amount);
    if (data.category !== undefined) updates.category = data.category;
    if (data.description !== undefined) updates.description = data.description;
    if (data.date !== undefined) updates.date = new Date(data.date);
    await expenseRepository.update(id, orgId, updates);
    return expenseRepository.findOne(id, orgId);
  }

  async deleteExpense(id, orgId) {
    const existing = await expenseRepository.findOne(id, orgId);
    if (!existing) {
      const err = new Error("Expense not found");
      err.status = 404;
      throw err;
    }
    await expenseRepository.delete(id, orgId);
  }
}

module.exports = new ExpenseService();
