const memberRepository = require("../repositories/member.repository");
const { prisma } = require("../../../../../config/prisma.config");

class MemberService {
  async _getMemberOrThrow(memberId, errorMessage = "Member not found") {
    const member = await memberRepository.get(memberId);
    if (!member) {
      throw new Error(errorMessage);
    }
    return member;
  }

  async createMember(memberData) {
    if (!memberData.orgId) {
      throw new Error("Organization ID is required");
    }

    // Auto-create org record from Clerk data if it doesn't exist yet
    const existingOrg = await prisma.organization.findUnique({
      where: { id: memberData.orgId },
    });
    if (!existingOrg) {
      await prisma.organization.create({
        data: {
          id: memberData.orgId,
          name: memberData.orgSlug || `Organization ${memberData.orgId}`,
          ownerUserId: memberData.ownerUserId,
        },
      });
    }

    if (memberData.clerkUserId) {
      const existingMember = await memberRepository.findByClerkIdAndOrg(
        memberData.clerkUserId,
        memberData.orgId,
      );
      if (existingMember) {
        throw new Error("Member already exists in this organization");
      }
    }

    return await memberRepository.create({
      orgId: memberData.orgId,
      clerkUserId: memberData.clerkUserId || null,
      firstName: memberData.firstName,
      lastName: memberData.lastName,
      email: memberData.email,
      phone: memberData.phone || "",
      dateOfBirth: memberData.dateOfBirth
        ? new Date(memberData.dateOfBirth)
        : new Date(),
      gender: memberData.gender || "Not specified",
      joinDate: memberData.joinDate
        ? new Date(memberData.joinDate)
        : new Date(),
      notes: memberData.notes || null,
      isActive: memberData.isActive ?? true,
    });
  }

  async getMemberById(memberId) {
    return await this._getMemberOrThrow(memberId);
  }

  async getAllMembers(
    organizationId,
    page = 1,
    limit = 10,
    includeInactive = true,
  ) {
    const result = await memberRepository.findActiveMembers(
      organizationId,
      page,
      limit,
      includeInactive,
    );

    return {
      members: result.data,
      pagination: result.pagination,
    };
  }

  async updateMember(memberId, updateData) {
    const member = await this._getMemberOrThrow(memberId);

    if (updateData.email && updateData.email !== member.email) {
      const existingMember = await memberRepository.findOne({
        email: updateData.email,
        orgId: member.orgId,
      });
      if (existingMember && existingMember.id !== memberId) {
        throw new Error("Email is already taken in this organization");
      }
    }

    const dbData = {};
    if (updateData.firstName !== undefined)
      dbData.firstName = updateData.firstName;
    if (updateData.lastName !== undefined)
      dbData.lastName = updateData.lastName;
    if (updateData.email !== undefined) dbData.email = updateData.email;
    if (updateData.phone !== undefined) dbData.phone = updateData.phone;
    if (updateData.gender !== undefined) dbData.gender = updateData.gender;
    if (updateData.notes !== undefined) dbData.notes = updateData.notes;
    if (updateData.isActive !== undefined)
      dbData.isActive = updateData.isActive;
    if (updateData.dateOfBirth !== undefined)
      dbData.dateOfBirth = new Date(updateData.dateOfBirth);
    if (updateData.joinDate !== undefined)
      dbData.joinDate = new Date(updateData.joinDate);

    return await memberRepository.update(memberId, dbData);
  }

  async deleteMember(memberId) {
    await this._getMemberOrThrow(memberId);
    await memberRepository.destroy(memberId);
    return { message: "Member deleted successfully" };
  }

  async searchMembers(
    organizationId,
    searchTerm,
    limit = 10,
    includeInactive = true,
  ) {
    return await memberRepository.searchMembers(
      organizationId,
      searchTerm,
      limit,
      includeInactive,
    );
  }

  async getMemberStats(organizationId) {
    return await memberRepository.getMemberStats(organizationId);
  }
}

module.exports = new MemberService();
