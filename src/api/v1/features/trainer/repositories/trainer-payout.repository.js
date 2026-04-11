const CrudRepository = require("../../../../../shared/repositories/crud.repository");
const { prisma } = require("../../../../../config/prisma.config");

class TrainerPayoutRepository extends CrudRepository {
  constructor() {
    super(prisma.trainerPayout);
  }

  /**
   * Find all payouts for a specific trainer
   */
  async findByTrainer(trainerId) {
    return await this.find(
      { trainerId },
      {
        orderBy: [{ year: "desc" }, { month: "desc" }],
        include: {
          training: {
            select: {
              id: true,
              finalPrice: true,
              startDate: true,
              endDate: true,
              member: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                },
              },
            },
          },
        },
      },
    );
  }

  /**
   * Get all existing payout records for a trainer (trainingId, month, year combos)
   * Used to compute which months have been paid.
   */
  async findPaidMonthsByTrainer(trainerId) {
    return await prisma.trainerPayout.findMany({
      where: { trainerId },
      select: {
        id: true,
        trainingId: true,
        month: true,
        year: true,
        amount: true,
        paidAt: true,
        expenseId: true,
      },
    });
  }

  /**
   * Check if a specific client-month payout already exists
   */
  async findExisting(trainingId, month, year) {
    return await this.findOne({ trainingId, month, year });
  }

  /**
   * Find a payout with its expenseId for deletion
   */
  async findByTrainingMonth(trainingId, trainerId, month, year) {
    return await prisma.trainerPayout.findUnique({
      where: { trainingId_month_year: { trainingId, month, year }, trainerId },
      select: { id: true, expenseId: true, orgId: true },
    });
  }

  /**
   * Sum total paid out to a trainer
   */
  async sumByTrainer(trainerId) {
    const result = await prisma.trainerPayout.aggregate({
      where: { trainerId },
      _sum: { amount: true },
    });
    return result._sum.amount ?? 0;
  }

  /**
   * For the trainers list: get outstanding payout totals per trainer for an org.
   * Returns a map of trainerId -> { totalEarned, totalPaid }
   */
  async getOutstandingSummaryByOrg(orgId) {
    // Sum paid per trainer
    const paidGroups = await prisma.trainerPayout.groupBy({
      by: ["trainerId"],
      where: { orgId },
      _sum: { amount: true },
    });

    const paidMap = {};
    for (const row of paidGroups) {
      paidMap[row.trainerId] = row._sum.amount ?? 0;
    }

    return paidMap;
  }
}

module.exports = new TrainerPayoutRepository();
