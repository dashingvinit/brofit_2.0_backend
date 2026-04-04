const { clerkClient } = require("@clerk/express");
const repo = require("../repositories/staff-permissions.repository");

const ALLOWED_FIELDS = [
  "canTakeAttendance",
  "canRegisterMember",
  "canCreateMembership",
  "canCreateTraining",
  "canRecordPayment",
  "canViewMembers",
  "canViewReports",
];

class StaffPermissionsService {
  async get(orgId) {
    const row = await repo.get(orgId);
    return row ?? { orgId, ...repo.DEFAULTS };
  }

  async update(orgId, data) {
    const filtered = Object.fromEntries(
      Object.entries(data).filter(([k]) => ALLOWED_FIELDS.includes(k))
    );
    return repo.upsert(orgId, filtered);
  }

  async getStaffMembers(orgId) {
    const { data: memberships } = await clerkClient.organizations.getOrganizationMembershipList({
      organizationId: orgId,
    });
    const staffOnly = memberships.filter((m) => m.role === "org:staff");
    const users = await Promise.all(
      staffOnly.map((m) => clerkClient.users.getUser(m.publicUserData.userId))
    );
    return staffOnly.map((m, i) => ({
      userId: m.publicUserData.userId,
      firstName: m.publicUserData.firstName,
      lastName: m.publicUserData.lastName,
      identifier: m.publicUserData.identifier,
      imageUrl: m.publicUserData.imageUrl,
      role: m.role,
      staffPermissions: users[i].publicMetadata?.staffPermissions ?? null,
    }));
  }

  async updateStaffMember(orgId, targetUserId, data) {
    const { data: memberships } = await clerkClient.organizations.getOrganizationMembershipList({
      organizationId: orgId,
    });
    const match = memberships.find((m) => m.publicUserData.userId === targetUserId);
    if (!match || match.role !== "org:staff") {
      const err = new Error("User is not org:staff in this org");
      err.statusCode = 403;
      throw err;
    }
    const filtered = Object.fromEntries(
      Object.entries(data).filter(([k]) => ALLOWED_FIELDS.includes(k))
    );
    const user = await clerkClient.users.getUser(targetUserId);
    const existing = user.publicMetadata ?? {};
    const merged = { ...(existing.staffPermissions ?? {}), ...filtered };
    await clerkClient.users.updateUser(targetUserId, {
      publicMetadata: { ...existing, staffPermissions: merged },
    });
    return { userId: targetUserId, staffPermissions: merged };
  }
}

module.exports = new StaffPermissionsService();
