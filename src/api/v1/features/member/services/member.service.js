const memberRepository = require("../repositories/member.repository");
const { prisma } = require("../../../../../config/prisma.config");
const { createError } = require("../../../../../shared/helpers/subscription.helper");
const { sendWelcomeTemplate } = require("../../../../../shared/services/whatsapp.service");
const notificationsRepository = require("../../notifications/repositories/notifications.repository");

class MemberService {
  async _getMemberOrThrow(memberId) {
    const member = await memberRepository.findByIdWithReferral(memberId);
    if (!member) {
      throw createError("Member not found", 404);
    }
    return member;
  }

  async createMember(memberData) {
    // Auto-create org record from Clerk data if it doesn't exist yet
    let org = await prisma.organization.findUnique({
      where: { id: memberData.orgId },
    });
    if (!org) {
      org = await prisma.organization.create({
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
        throw createError("Member already exists in this organization", 409);
      }
    }

    if (memberData.referredById) {
      const referrer = await memberRepository.get(memberData.referredById);
      if (!referrer || referrer.orgId !== memberData.orgId) {
        throw createError("Referring member not found in this organization", 400);
      }
    }

    const member = await memberRepository.create({
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
      referredById: memberData.referredById || null,
    });

    // Fire-and-forget welcome template (never blocks or throws)
    // Sends an approved WhatsApp template which opens the 24h free-form window
    if (member.phone) {
      notificationsRepository.getSettings(memberData.orgId).then(async (settings) => {
        if (settings?.welcomeEnabled) {
          const gymName = org?.name || `Organization`;
          await sendWelcomeTemplate(member.phone, {
            memberName: member.firstName,
            gymName,
          });
        }
      }).catch(() => {});
    }

    return member;
  }

  async getMemberById(memberId) {
    return await this._getMemberOrThrow(memberId);
  }

  async getAllMembers(organizationId, page = 1, limit = 10, isActive = null, joinedFrom = null, joinedTo = null) {
    const result = await memberRepository.findActiveMembers(
      organizationId,
      page,
      limit,
      isActive,
      joinedFrom,
      joinedTo,
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
        throw createError("Email is already taken in this organization", 409);
      }
    }

    const dbData = {};
    if (updateData.firstName !== undefined) dbData.firstName = updateData.firstName;
    if (updateData.lastName !== undefined) dbData.lastName = updateData.lastName;
    if (updateData.email !== undefined) dbData.email = updateData.email;
    if (updateData.phone !== undefined) dbData.phone = updateData.phone;
    if (updateData.gender !== undefined) dbData.gender = updateData.gender;
    if (updateData.notes !== undefined) dbData.notes = updateData.notes;
    if (updateData.isActive !== undefined) dbData.isActive = updateData.isActive;
    if (updateData.dateOfBirth !== undefined) dbData.dateOfBirth = new Date(updateData.dateOfBirth);
    if (updateData.joinDate !== undefined) dbData.joinDate = new Date(updateData.joinDate);
    if (updateData.referredById !== undefined) {
      if (updateData.referredById === memberId) {
        throw createError("A member cannot refer themselves", 400);
      }
      if (updateData.referredById) {
        const referrer = await memberRepository.get(updateData.referredById);
        if (!referrer || referrer.orgId !== member.orgId) {
          throw createError("Referring member not found in this organization", 400);
        }
      }
      dbData.referredById = updateData.referredById || null;
    }

    return await memberRepository.update(memberId, dbData);
  }

  async batchUpdateMembers(memberIds, updateData) {
    const results = await Promise.allSettled(
      memberIds.map((id) => memberRepository.update(id, updateData))
    );
    const succeeded = results.filter((r) => r.status === 'fulfilled').length;
    const failed = results.filter((r) => r.status === 'rejected').length;
    return { succeeded, failed, total: memberIds.length };
  }

  async batchDeleteMembers(memberIds) {
    const results = await Promise.allSettled(
      memberIds.map((id) => memberRepository.destroy(id))
    );
    const succeeded = results.filter((r) => r.status === 'fulfilled').length;
    const failed = results.filter((r) => r.status === 'rejected').length;
    return { succeeded, failed, total: memberIds.length };
  }

  async deleteMember(memberId) {
    await this._getMemberOrThrow(memberId);
    await memberRepository.destroy(memberId);
    return { message: "Member deleted successfully" };
  }

  async searchMembers(organizationId, searchTerm, limit = 10, includeInactive = true) {
    return await memberRepository.searchMembers(organizationId, searchTerm, limit, includeInactive);
  }

  async getMemberStats(organizationId) {
    return await memberRepository.getMemberStats(organizationId);
  }
}

module.exports = new MemberService();
