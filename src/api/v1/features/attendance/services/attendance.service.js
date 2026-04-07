const attendanceRepository = require("../repositories/attendance.repository");
const memberRepository = require("../../member/repositories/member.repository");
const { createError } = require("../../../../../shared/helpers/subscription.helper");

class AttendanceService {
  /**
   * Check in a member.
   * Prevents double check-in if they already have an open record today.
   */
  async checkIn(orgId, memberId, notes = null) {
    const member = await memberRepository.findOne({ id: memberId, orgId });
    if (!member) throw createError("Member not found in this organization", 404);

    const existing = await attendanceRepository.findOpenRecord(orgId, memberId);
    if (existing) {
      throw createError("Member is already checked in", 409);
    }

    const now = new Date();
    const today = new Date(now);
    today.setHours(0, 0, 0, 0);

    const record = await attendanceRepository.create({
      orgId,
      memberId,
      entryTime: now,
      exitTime: null,
      date: today,
      notes: notes || null,
    });

    // Fire-and-forget: update hourly snapshot (non-blocking)
    attendanceRepository
      .incrementHourlySnapshot(orgId, today, now.getHours())
      .catch(() => {});

    return record;
  }

  /**
   * Check out a member by their open attendance record ID.
   */
  async checkOut(orgId, attendanceId) {
    const record = await attendanceRepository.findOne({ id: attendanceId, orgId });
    if (!record) throw createError("Attendance record not found", 404);
    if (record.exitTime) throw createError("Member has already checked out", 409);

    return await attendanceRepository.update(attendanceId, { exitTime: new Date() });
  }

  /**
   * Get all members currently inside the gym (checked in, not yet out).
   */
  async getCurrentlyInside(orgId) {
    const records = await attendanceRepository.findCurrentlyInside(orgId);
    const count = records.length;
    return { count, records };
  }

  /**
   * Get attendance records for a specific date (defaults to today).
   */
  async getByDate(orgId, date) {
    const targetDate = date ? new Date(date + "T00:00:00") : new Date();
    const records = await attendanceRepository.findByDate(orgId, targetDate);
    const totalVisits = records.length;
    const currentlyInside = records.filter((r) => !r.exitTime).length;
    return { totalVisits, currentlyInside, records };
  }

  /**
   * Get attendance history for a specific member.
   */
  async getMemberHistory(orgId, memberId, page = 1, limit = 20) {
    const member = await memberRepository.findOne({ id: memberId, orgId });
    if (!member) throw createError("Member not found in this organization", 404);
    const result = await attendanceRepository.findByMember(orgId, memberId, page, limit);
    return {
      records: result.data,
      pagination: result.pagination,
    };
  }

  /**
   * Peak hours chart data: today's per-hour counts + historical avg per hour.
   * avg is read from pre-computed snapshots — O(snapshot rows) not O(all records).
   */
  async getPeakHoursData(orgId) {
    const [today, avg] = await Promise.all([
      attendanceRepository.getTodayHourlyCounts(orgId),
      attendanceRepository.getHourlyAvg(orgId),
    ]);
    return { today, avg };
  }

  /**
   * Quick stats: how many inside right now + total visits today.
   */
  async getTodayStats(orgId) {
    const today = new Date();
    const [currentlyInside, totalToday] = await Promise.all([
      attendanceRepository.countCurrentlyInside(orgId),
      attendanceRepository.countByDate(orgId, today),
    ]);
    return { currentlyInside, totalToday };
  }
}

module.exports = new AttendanceService();
