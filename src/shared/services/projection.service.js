/**
 * Pure projection simulation — no DB access, no imports.
 * The controller is responsible for fetching inputs and passing them in.
 *
 * @param {object} params
 * @param {number} params.startMembers
 * @param {number} params.avgNewPerMonth
 * @param {number} params.churnRate        - Monthly churn rate (0–1)
 * @param {number} params.arpu             - Avg revenue per member per month
 * @param {number} params.fixedCostPerMonth
 * @param {number} params.capex            - Total investment (for payback/ROI calc)
 * @param {number} params.horizonMonths
 * @param {number} [params.newJoinsMultiplier=1]
 * @param {number} [params.churnMultiplier=1]
 */
function simulate({ startMembers, avgNewPerMonth, churnRate, arpu, fixedCostPerMonth, capex, horizonMonths, newJoinsMultiplier = 1, churnMultiplier = 1 }) {
  const months = [];
  let members = startMembers;
  let cumulativeProfit = 0;
  let paybackMonth = null;

  const effectiveChurn = Math.min(1, churnRate * churnMultiplier);

  for (let t = 1; t <= horizonMonths; t++) {
    const newJoins = Math.round(avgNewPerMonth * newJoinsMultiplier);
    const churned = Math.round(members * effectiveChurn);
    members = Math.max(0, members + newJoins - churned);

    const revenue = Math.round(members * arpu);
    const profit = revenue - fixedCostPerMonth;
    cumulativeProfit += profit;

    if (paybackMonth === null && cumulativeProfit >= capex) paybackMonth = t;

    months.push({ month: t, members, revenue, cost: fixedCostPerMonth, profit: Math.round(profit), cumulativeProfit: Math.round(cumulativeProfit) });
  }

  const roiAtHorizon = capex > 0 ? Math.round((cumulativeProfit / capex) * 10000) / 100 : null;
  return { months, paybackMonth, roiAtHorizon };
}

/**
 * Run base / worst / best scenarios given pre-fetched unit economics inputs.
 * Worst: −20% new joins, +20% churn
 * Best:  +30% new joins, −20% churn
 */
function runProjection({ activeMembers, arpu, churnRate, avgNewJoinsPerMonth, fixedCostPerMonth, capex, horizonMonths, dataPoints, window, fixedCostSource = "override" }) {
  const base = { startMembers: activeMembers, avgNewPerMonth: avgNewJoinsPerMonth, churnRate, arpu, fixedCostPerMonth, capex, horizonMonths };

  return {
    inputs: {
      activeMembers, arpu, churnRate,
      churnPercent: Math.round(churnRate * 10000) / 100,
      avgNewJoinsPerMonth, fixedCostPerMonth, fixedCostSource, capex,
      window, horizon: horizonMonths, dataPoints,
    },
    base:  simulate(base),
    worst: simulate({ ...base, newJoinsMultiplier: 0.8, churnMultiplier: 1.2 }),
    best:  simulate({ ...base, newJoinsMultiplier: 1.3, churnMultiplier: 0.8 }),
  };
}

module.exports = { runProjection };
