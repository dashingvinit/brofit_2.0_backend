const { prisma } = require("../../../../../config/prisma.config");
const trainerPayoutRepository = require("../repositories/trainer-payout.repository");
const trainerRepository = require("../repositories/trainer.repository");
const { createError } = require("../../../../../shared/helpers/subscription.helper");

const SPLIT_PERCENT = 60;

/**
 * Generate exactly `numMonths` month slots starting from the training's startDate.
 * Uses the plan's durationDays to determine how many months to pay out —
 * e.g. a 30-day plan → 1 slot, a 90-day plan → 3 slots.
 */
function getTrainingMonths(startDate, durationDays) {
  const numMonths = Math.round(durationDays / 30);
  const months = [];
  const start = new Date(startDate);

  for (let i = 0; i < numMonths; i++) {
    const d = new Date(start.getFullYear(), start.getMonth() + i, 1);
    months.push({ month: d.getMonth() + 1, year: d.getFullYear() });
  }
  return months;
}

class TrainerPayoutService {
  async _getTrainerOrThrow(trainerId) {
    const trainer = await trainerRepository.get(trainerId);
    if (!trainer) throw createError("Trainer not found", 404);
    return trainer;
  }

  /**
   * Returns the payout schedule for all active clients of a trainer.
   * Each client row has:
   *   - training info (id, member, plan, dates, finalPrice)
   *   - months: array of { month, year, revenueBase, amount, paid, paidAt, payoutId }
   */
  async getPayoutSchedule(trainerId) {
    const trainer = await this._getTrainerOrThrow(trainerId);
    const splitPercent = trainer.splitPercent ?? SPLIT_PERCENT;

    // Fetch active and expired trainings for this trainer
    const trainings = await prisma.training.findMany({
      where: { trainerId, status: { in: ["active", "expired"] } },
      include: {
        member: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            phone: true,
            email: true,
          },
        },
        planVariant: {
          include: { planType: { select: { name: true } } },
        },
      },
      orderBy: { endDate: "asc" },
    });

    // Fetch all existing payouts for this trainer
    const existingPayouts = await trainerPayoutRepository.findPaidMonthsByTrainer(trainerId);

    // Build a lookup: "trainingId-month-year" -> payout
    const paidSet = {};
    for (const p of existingPayouts) {
      paidSet[`${p.trainingId}-${p.month}-${p.year}`] = p;
    }

    // Build schedule rows
    const rows = trainings.map((training) => {
      const months = getTrainingMonths(training.startDate, training.planVariant?.durationDays ?? 30);
      const totalMonths = months.length;
      const revenueBase = totalMonths > 0 ? training.finalPrice / totalMonths : 0;
      const amount = parseFloat(((revenueBase * splitPercent) / 100).toFixed(2));

      const monthSlots = months.map(({ month, year }) => {
        const key = `${training.id}-${month}-${year}`;
        const payout = paidSet[key];
        return {
          month,
          year,
          revenueBase: parseFloat(revenueBase.toFixed(2)),
          amount,
          paid: !!payout,
          paidAt: payout?.paidAt ?? null,
        };
      });

      return {
        training: {
          id: training.id,
          status: training.status,
          startDate: training.startDate,
          endDate: training.endDate,
          finalPrice: training.finalPrice,
          member: training.member,
          planVariant: training.planVariant,
        },
        months: monthSlots,
        totalMonths,
        totalOwed: parseFloat((amount * totalMonths).toFixed(2)),
        totalPaid: parseFloat(
          (amount * monthSlots.filter((m) => m.paid).length).toFixed(2),
        ),
        outstanding: parseFloat(
          (amount * monthSlots.filter((m) => !m.paid).length).toFixed(2),
        ),
      };
    });

    // Summary
    const summary = {
      totalOwed: parseFloat(rows.reduce((s, r) => s + r.totalOwed, 0).toFixed(2)),
      totalPaid: parseFloat(rows.reduce((s, r) => s + r.totalPaid, 0).toFixed(2)),
      outstanding: parseFloat(rows.reduce((s, r) => s + r.outstanding, 0).toFixed(2)),
    };

    return { rows, summary, splitPercent };
  }

  /**
   * Record a cash payout for a specific training-month.
   */
  async recordPayout(trainerId, trainingId, month, year, notes) {
    const trainer = await this._getTrainerOrThrow(trainerId);
    const splitPercent = trainer.splitPercent ?? SPLIT_PERCENT;

    // Verify training belongs to this trainer
    const training = await prisma.training.findFirst({
      where: { id: trainingId, trainerId },
      include: { planVariant: { select: { durationDays: true } } },
    });
    if (!training) throw createError("Training not found for this trainer", 404);

    // Check not already paid
    const existing = await trainerPayoutRepository.findExisting(trainingId, month, year);
    if (existing) throw createError("This month has already been paid out", 409);

    // Calculate amount
    const months = getTrainingMonths(training.startDate, training.planVariant?.durationDays ?? 30);
    const totalMonths = months.length;
    if (totalMonths === 0) throw createError("Training has no valid months", 400);

    // Verify the requested month is within the training range
    const isValidMonth = months.some((m) => m.month === month && m.year === year);
    if (!isValidMonth) throw createError("Month is not within the training period", 400);

    const revenueBase = training.finalPrice / totalMonths;
    const amount = parseFloat(((revenueBase * splitPercent) / 100).toFixed(2));

    const payout = await trainerPayoutRepository.create({
      orgId: training.orgId,
      trainerId,
      trainingId,
      month,
      year,
      revenueBase: parseFloat(revenueBase.toFixed(2)),
      splitPercent,
      amount,
      notes: notes ?? null,
      paidAt: new Date(),
    });

    return payout;
  }

  /**
   * Get payout history for a trainer (all recorded payouts).
   */
  async getPayoutHistory(trainerId) {
    await this._getTrainerOrThrow(trainerId);
    return await trainerPayoutRepository.findByTrainer(trainerId);
  }

  /**
   * Get outstanding payout totals for all trainers in an org.
   * Used by the trainers list page.
   */
  async getOutstandingSummary(orgId) {
    // Fetch trainers with their split percent
    const trainers = await prisma.trainer.findMany({
      where: { orgId },
      select: { id: true, splitPercent: true },
    });
    const splitByTrainer = {};
    for (const t of trainers) {
      splitByTrainer[t.id] = t.splitPercent ?? SPLIT_PERCENT;
    }

    // Get all active trainings grouped by trainer
    const trainings = await prisma.training.findMany({
      where: {
        trainer: { orgId },
        status: "active",
      },
      select: {
        id: true,
        trainerId: true,
        finalPrice: true,
        startDate: true,
        planVariant: { select: { durationDays: true } },
      },
    });

    // Get all existing payouts for the org
    const payouts = await prisma.trainerPayout.findMany({
      where: { orgId },
      select: { trainerId: true, amount: true },
    });

    const paidByTrainer = {};
    for (const p of payouts) {
      paidByTrainer[p.trainerId] = (paidByTrainer[p.trainerId] ?? 0) + p.amount;
    }

    const owedByTrainer = {};
    for (const training of trainings) {
      const months = getTrainingMonths(training.startDate, training.planVariant?.durationDays ?? 30);
      const totalMonths = months.length;
      if (totalMonths === 0) continue;
      const split = splitByTrainer[training.trainerId] ?? SPLIT_PERCENT;
      const monthlyAmount = parseFloat(
        (((training.finalPrice / totalMonths) * split) / 100).toFixed(2),
      );
      const totalOwed = monthlyAmount * totalMonths;
      owedByTrainer[training.trainerId] =
        (owedByTrainer[training.trainerId] ?? 0) + totalOwed;
    }

    // Build result: trainerId -> { totalOwed, totalPaid, outstanding }
    const allTrainerIds = new Set([
      ...Object.keys(owedByTrainer),
      ...Object.keys(paidByTrainer),
    ]);

    const result = {};
    for (const tid of allTrainerIds) {
      const totalOwed = parseFloat((owedByTrainer[tid] ?? 0).toFixed(2));
      const totalPaid = parseFloat((paidByTrainer[tid] ?? 0).toFixed(2));
      result[tid] = {
        totalOwed,
        totalPaid,
        outstanding: parseFloat((totalOwed - totalPaid).toFixed(2)),
      };
    }

    return result;
  }
}

module.exports = new TrainerPayoutService();
