const CrudRepository = require("../../../../../shared/repositories/crud.repository");
const { prisma } = require("../../../../../config/prisma.config");

class AttendanceRepository extends CrudRepository {
  constructor() {
    super(prisma.attendance);
  }

  /**
   * Find the open (no exit) attendance record for a member today.
   */
  async findOpenRecord(orgId, memberId) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return await prisma.attendance.findFirst({
      where: {
        orgId,
        memberId,
        date: today,
        exitTime: null,
      },
    });
  }

  /**
   * All members currently inside (exitTime is null, date is today).
   */
  async findCurrentlyInside(orgId) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
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
    const day = new Date(date);
    day.setHours(0, 0, 0, 0);
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
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return await prisma.attendance.count({
      where: { orgId, date: today, exitTime: null },
    });
  }

  /**
   * Total visit count for a date (for daily stats).
   */
  async countByDate(orgId, date) {
    const day = new Date(date);
    day.setHours(0, 0, 0, 0);
    return await prisma.attendance.count({ where: { orgId, date: day } });
  }
}

module.exports = new AttendanceRepository();
