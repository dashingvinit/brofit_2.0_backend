const CrudRepository = require("../../../../../shared/repositories/crud.repository");
const { prisma } = require("../../../../../config/prisma.config");
const { startOfDay } = require("../../../../../shared/helpers/subscription.helper");

class AttendanceRepository extends CrudRepository {
  constructor() {
    super(prisma.attendance);
  }

  /**
   * Find the open (no exit) attendance record for a member today.
   */
  async findOpenRecord(orgId, memberId) {
    return await prisma.attendance.findFirst({
      where: { orgId, memberId, exitTime: null },
    });
  }

  /**
   * All members currently inside (exitTime is null, date is today).
   */
  async findCurrentlyInside(orgId) {
    const today = startOfDay();
    return await prisma.attendance.findMany({
      where: {
        orgId,
        date: today,
        exitTime: null,
      },
      include: {
        member: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            phone: true,
            email: true,
            memberships: {
              where: { status: "active" },
              take: 1,
              orderBy: { startDate: "desc" },
              select: {
                id: true,
                planVariant: {
                  select: {
                    durationLabel: true,
                    planType: { select: { name: true, category: true } },
                  },
                },
              },
            },
          },
        },
      },
      orderBy: { entryTime: "asc" },
    });
  }

  /**
   * All attendance records for a specific date (defaults to today).
   */
  async findByDate(orgId, date) {
    const day = startOfDay(date);
    return await prisma.attendance.findMany({
      where: { orgId, date: day },
      include: {
        member: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            phone: true,
            email: true,
            memberships: {
              where: { status: "active" },
              take: 1,
              orderBy: { startDate: "desc" },
              select: {
                id: true,
                planVariant: {
                  select: {
                    durationLabel: true,
                    planType: { select: { name: true, category: true } },
                  },
                },
              },
            },
          },
        },
      },
      orderBy: { entryTime: "asc" },
    });
  }

  /**
   * Attendance history for a single member, paginated.
   */
  async findByMember(orgId, memberId, page = 1, limit = 20) {
    return await this.findWithPagination(
      { orgId, memberId },
      {
        page,
        limit,
        orderBy: { entryTime: "desc" },
        include: {
          member: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              phone: true,
            },
          },
        },
      },
    );
  }

  /**
   * Count of members currently inside.
   */
  async countCurrentlyInside(orgId) {
    const today = startOfDay();
    return await prisma.attendance.count({
      where: { orgId, date: today, exitTime: null },
    });
  }

  /**
   * Total visit count for a date (for daily stats).
   */
  async countByDate(orgId, date) {
    const day = startOfDay(date);
    return await prisma.attendance.count({ where: { orgId, date: day } });
  }

  // ─── Hourly snapshot helpers ────────────────────────────────────────────────

  /**
   * Increment the snapshot count for a specific org/date/hour by 1.
   * Creates the row if it doesn't exist yet (upsert).
   */
  async incrementHourlySnapshot(orgId, date, hour) {
    const day = startOfDay(date);
    await prisma.attendanceHourlySnapshot.upsert({
      where: { orgId_date_hour: { orgId, date: day, hour } },
      update: { count: { increment: 1 } },
      create: { orgId, date: day, hour, count: 1 },
    });
  }

  /**
   * Average check-in count per hour across all recorded days.
   * Returns 24 buckets: [{ hour: 0, avg: 1.2 }, ...]
   */
  async getHourlyAvg(orgId) {
    // Raw query: AVG(count) per hour, grouped across all dates
    const rows = await prisma.$queryRaw`
      SELECT hour, AVG(count)::float AS avg
      FROM attendance_hourly_snapshots
      WHERE org_id = ${orgId}
      GROUP BY hour
      ORDER BY hour
    `;

    // Build a full 24-slot array with 0 for hours with no data
    const map = Object.fromEntries(rows.map((r) => [r.hour, r.avg]));
    return Array.from({ length: 24 }, (_, h) => ({
      hour: h,
      avg: map[h] ? parseFloat(map[h].toFixed(2)) : 0,
    }));
  }

  /**
   * Today's per-hour check-in counts directly from the attendance table.
   * Returns 24 buckets: [{ hour: 0, count: 3 }, ...]
   */
  async getTodayHourlyCounts(orgId) {
    const today = startOfDay();

    const records = await prisma.attendance.findMany({
      where: { orgId, date: today },
      select: { entryTime: true },
    });

    const buckets = Array(24).fill(0);
    for (const r of records) {
      buckets[new Date(r.entryTime).getHours()]++;
    }
    return buckets.map((count, hour) => ({ hour, count }));
  }
}

module.exports = new AttendanceRepository();
