const investmentRepository = require("../repositories/investment.repository");

class InvestmentService {
  async createInvestment(orgId, { name, amount, date, notes }) {
    return investmentRepository.create({
      orgId,
      name,
      amount: parseFloat(amount),
      date: new Date(date),
      notes: notes || null,
    });
  }

  async getInvestments(orgId) {
    return investmentRepository.findMany(orgId);
  }

  async updateInvestment(id, orgId, data) {
    const existing = await investmentRepository.findOne(id, orgId);
    if (!existing) {
      const err = new Error("Investment not found");
      err.status = 404;
      throw err;
    }
    const updates = {};
    if (data.name !== undefined) updates.name = data.name;
    if (data.amount !== undefined) updates.amount = parseFloat(data.amount);
    if (data.date !== undefined) updates.date = new Date(data.date);
    if (data.notes !== undefined) updates.notes = data.notes;
    await investmentRepository.update(id, orgId, updates);
    return investmentRepository.findOne(id, orgId);
  }

  async deleteInvestment(id, orgId) {
    const existing = await investmentRepository.findOne(id, orgId);
    if (!existing) {
      const err = new Error("Investment not found");
      err.status = 404;
      throw err;
    }
    await investmentRepository.delete(id, orgId);
  }
}

module.exports = new InvestmentService();
