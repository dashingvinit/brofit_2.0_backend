const attendanceRepository = require("../repositories/attendance.repository");
const memberRepository = require("../../member/repositories/member.repository");
const { createError } = require("../../../../../shared/helpers/subscription.helper");

class AttendanceService {
  async _getMemberOrThrow(memberId, orgId) {
    const member = await memberRepository.findOne({ id: memberId, orgId });
    if (!member) {
      throw createError("Member not found in this organization", 404);
    }
    return member;
  }

  /**
   * Check in a member.
   * Prevents double check-in if they already have an open record today.
   */
  async checkIn(orgId, memberId, notes = null) {
    await this._getMemberOrThrow(memberId, orgId);

    const existing = await attendanceRepository.findOpenRecord(orgId, memberId);
    if (existing) {
      throw createError("Member is already checked in", 409);
    }

    const now = new Date();
    const today = new Date(now);
    today.setHours(0, 0, 0, 0);

    return await attendanceRepository.create({
      orgId,
      memberId,
      entryTime: now,
      exitTime: null,
      date: today,
      notes: notes || null,
    });
  }

  /**
   * Check out a member by their open attendance record ID.
   */
  async checkOut(orgId, attendanceId) {
    const record = await attendanceRepository.get(attendanceId);
    if (!record) {
      throw createError("Attendance record not found", 404);
    }
    if (record.orgId !== orgId) {
      throw createError("Attendance record not found", 404);
    }
    if (record.exitTime) {
      throw createError("Member has already checked out", 409);
    }

    return await attendanceRepository.update(attendanceId, {
      exitTime: new Date(),
    });
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
    const targetDate = date ? new Date(date) : new Date();
    const records = await attendanceRepository.findByDate(orgId, targetDate);
    const totalVisits = records.length;
    const currentlyInside = records.filter((r) => !r.exitTime).length;
    return { totalVisits, currentlyInside, records };
  }

  /**
   * Get attendance history for a specific member.
   */
  async getMemberHistory(orgId, memberId, page = 1, limit = 20) {
    await this._getMemberOrThrow(memberId, orgId);
    const result = await attendanceRepository.findByMember(orgId, memberId, page, limit);
    return {
      records: result.data,
      pagination: result.pagination,
    };
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
