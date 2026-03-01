const express = require("express");
const expenseController = require("./controllers/expense.controller");
const investmentController = require("./controllers/investment.controller");
const analyticsController = require("./controllers/analytics.controller");

const router = express.Router();

// ─── Expenses ────────────────────────────────────────────────────────────────
// GET  /api/v1/financials/expenses?month=YYYY-MM
router.get("/expenses", expenseController.getExpenses);
// POST /api/v1/financials/expenses
router.post("/expenses", expenseController.createExpense);
// PATCH /api/v1/financials/expenses/:id
router.patch("/expenses/:id", expenseController.updateExpense);
// DELETE /api/v1/financials/expenses/:id
router.delete("/expenses/:id", expenseController.deleteExpense);

// ─── Investments ─────────────────────────────────────────────────────────────
// GET  /api/v1/financials/investments
router.get("/investments", investmentController.getInvestments);
// POST /api/v1/financials/investments
router.post("/investments", investmentController.createInvestment);
// PATCH /api/v1/financials/investments/:id
router.patch("/investments/:id", investmentController.updateInvestment);
// DELETE /api/v1/financials/investments/:id
router.delete("/investments/:id", investmentController.deleteInvestment);

// ─── Analytics ───────────────────────────────────────────────────────────────
// GET /api/v1/financials/summary?month=YYYY-MM
router.get("/summary", analyticsController.getSummary);
// GET /api/v1/financials/roi
router.get("/roi", analyticsController.getRoi);
// GET /api/v1/financials/trends?months=12
router.get("/trends", analyticsController.getTrends);

module.exports = router;
