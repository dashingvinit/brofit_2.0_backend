const memberRepository = require("../repositories/member.repository");
const { prisma } = require("../../../../../config/prisma.config");
const {
  createError,
  executeBatch,
} = require("../../../../../shared/helpers/subscription.helper");
const {
  sendWelcomeTemplate,
} = require("../../../../../shared/services/whatsapp.service");
const config = require("../../../../../config/env.config");
const notificationsRepository = require("../../notifications/repositories/notifications.repository");

function normalizeSearchText(value = "") {
  return String(value)
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function searchTokens(value = "") {
  return normalizeSearchText(value).split(" ").filter(Boolean);
}

function typoDistance(a, b) {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;

  const distances = Array.from({ length: a.length + 1 }, () =>
    Array(b.length + 1).fill(0),
  );

  for (let i = 0; i <= a.length; i++) distances[i][0] = i;
  for (let j = 0; j <= b.length; j++) distances[0][j] = j;

  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      distances[i][j] = Math.min(
        distances[i][j - 1] + 1,
        distances[i - 1][j] + 1,
        distances[i - 1][j - 1] + cost,
      );

      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
        distances[i][j] = Math.min(
          distances[i][j],
          distances[i - 2][j - 2] + 1,
        );
      }
    }
  }

  return distances[a.length][b.length];
}

function similarity(a, b) {
  const longest = Math.max(a.length, b.length);
  if (longest === 0) return 1;
  return 1 - typoDistance(a, b) / longest;
}

function tokenScore(queryToken, candidateTokens) {
  let best = 0;

  for (const candidateToken of candidateTokens) {
    if (candidateToken === queryToken) best = Math.max(best, 180);
    else if (candidateToken.startsWith(queryToken)) best = Math.max(best, 150);
    else if (candidateToken.includes(queryToken)) best = Math.max(best, 120);
    else {
      const match = similarity(queryToken, candidateToken);
      if (match >= 0.84) best = Math.max(best, 110);
      else if (queryToken.length >= 4 && match >= 0.72)
        best = Math.max(best, 75);
    }
  }

  return best;
}

function scoreMemberSearchResult(member, rawSearchTerm) {
  const query = normalizeSearchText(rawSearchTerm);
  const tokens = searchTokens(rawSearchTerm);
  const fullName = normalizeSearchText(
    [member.firstName, member.middleName, member.lastName]
      .filter(Boolean)
      .join(" "),
  );
  const reverseName = normalizeSearchText(
    [member.lastName, member.firstName].join(" "),
  );
  const nameTokens = searchTokens(fullName);
  const email = normalizeSearchText(member.email);
  const phone = normalizeSearchText(member.phone);
  const planNames = member.memberships
    .map((membership) => membership.planVariant?.planType?.name)
    .filter(Boolean)
    .map(normalizeSearchText);
  const searchableTokens = [
    ...nameTokens,
    ...searchTokens(email),
    phone,
    ...planNames.flatMap(searchTokens),
  ].filter(Boolean);

  let score = 0;

  if (fullName === query) score += 1000;
  else if (reverseName === query) score += 950;
  else if (fullName.startsWith(query)) score += 850;
  else if (reverseName.startsWith(query)) score += 800;
  else if (fullName.includes(query)) score += 650;
  else if (email.includes(query)) score += 420;
  else if (phone.includes(query)) score += 420;

  const tokenScores = tokens.map((token) =>
    tokenScore(token, searchableTokens),
  );
  const matchedTokens = tokenScores.filter((value) => value > 0).length;
  score += tokenScores.reduce((sum, value) => sum + value, 0);

  if (tokens.length > 1 && matchedTokens === tokens.length) score += 260;
  if (
    tokens.length > 1 &&
    nameTokens.some((token) => token.startsWith(tokens[0]))
  ) {
    score += 80;
  }
  if (!member.isActive) score -= 20;

  return {
    score,
    matchedTokens,
    createdAtTime: new Date(member.createdAt).getTime(),
  };
}

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
        throw createError(
          "Referring member not found in this organization",
          400,
        );
      }
    }

    const member = await memberRepository.create({
      orgId: memberData.orgId,
      clerkUserId: memberData.clerkUserId || null,
      firstName: memberData.firstName,
      middleName: memberData.middleName || null,
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
      notificationsRepository
        .getSettings(memberData.orgId)
        .then(async (settings) => {
          if (settings?.welcomeEnabled) {
            const gymName = org?.name || `Organization`;
            const statusCallbackUrl = config.server.publicUrl
              ? `${config.server.publicUrl}/api/v1/webhooks/whatsapp/status`
              : null;
            const sid = await sendWelcomeTemplate(member.phone, {
              memberName: member.firstName,
              gymName,
              statusCallbackUrl,
            });
            // Only stamp when statusCallback is not configured (no webhook to confirm delivery).
            // When statusCallbackUrl is set, the webhook stamps welcomeSentAt on confirmed delivery.
            if (sid && !statusCallbackUrl) {
              await prisma.member.update({
                where: { id: member.id },
                data: { welcomeSentAt: new Date() },
              });
            }
          }
        })
        .catch((err) => {
          console.error(
            `[WhatsApp] Failed to send welcome message to member ${member.id}:`,
            err?.message || err,
          );
        });
    }

    return member;
  }

  async getMemberById(memberId, orgId = null) {
    const member = await this._getMemberOrThrow(memberId);
    if (orgId && member.orgId !== orgId) {
      throw createError("Member not found", 404);
    }
    return member;
  }

  async getAllMembers(
    organizationId,
    page = 1,
    limit = 10,
    isActive = null,
    joinedFrom = null,
    joinedTo = null,
    planTypeId = null,
    hasDiscount = false,
    noMembership = false,
  ) {
    const result = await memberRepository.findActiveMembers(
      organizationId,
      page,
      limit,
      isActive,
      joinedFrom,
      joinedTo,
      planTypeId,
      hasDiscount,
      noMembership,
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
    if (updateData.firstName !== undefined)
      dbData.firstName = updateData.firstName;
    if (updateData.middleName !== undefined)
      dbData.middleName = updateData.middleName || null;
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
    if (updateData.referredById !== undefined) {
      if (updateData.referredById === memberId) {
        throw createError("A member cannot refer themselves", 400);
      }
      if (updateData.referredById) {
        const referrer = await memberRepository.get(updateData.referredById);
        if (!referrer || referrer.orgId !== member.orgId) {
          throw createError(
            "Referring member not found in this organization",
            400,
          );
        }
      }
      dbData.referredById = updateData.referredById || null;
    }

    return await memberRepository.update(memberId, dbData);
  }

  async batchUpdateMembers(memberIds, updateData) {
    return executeBatch(memberIds, (id) =>
      memberRepository.update(id, updateData),
    );
  }

  async batchDeleteMembers(memberIds) {
    return executeBatch(memberIds, (id) => this.deleteMember(id));
  }

  async deleteMember(memberId) {
    const member = await this._getMemberOrThrow(memberId);

    await prisma.$transaction(async (tx) => {
      // 1. Delete Attendances
      await tx.attendance.deleteMany({ where: { memberId } });

      // 2. Delete Payments
      await tx.payment.deleteMany({ where: { memberId } });

      // 3. Delete TrainerPayouts related to member's trainings
      const trainings = await tx.training.findMany({
        where: { memberId },
        select: { id: true },
      });
      const trainingIds = trainings.map((t) => t.id);
      if (trainingIds.length > 0) {
        await tx.trainerPayout.deleteMany({
          where: { trainingId: { in: trainingIds } },
        });
      }

      // 4. Delete Trainings
      await tx.training.deleteMany({ where: { memberId } });

      // 5. Delete Memberships
      await tx.membership.deleteMany({ where: { memberId } });

      // 6. Clear referral links (if this member referred others)
      await tx.member.updateMany({
        where: { referredById: memberId },
        data: { referredById: null },
      });

      // 7. Finally delete the member record
      await tx.member.delete({ where: { id: memberId } });
    });

    return { message: "Member and all associated data permanently deleted" };
  }

  async searchMembers(
    organizationId,
    searchTerm,
    limit = 10,
    includeInactive = true,
  ) {
    const candidates = await memberRepository.searchMembers(
      organizationId,
      includeInactive,
    );

    return candidates
      .map((member) => ({
        member,
        rank: scoreMemberSearchResult(member, searchTerm),
      }))
      .filter(({ rank }) => rank.score > 0 && rank.matchedTokens > 0)
      .sort((a, b) => {
        if (b.rank.score !== a.rank.score) return b.rank.score - a.rank.score;
        return b.rank.createdAtTime - a.rank.createdAtTime;
      })
      .slice(0, limit)
      .map(({ member }) => member);
  }

  async getMemberStats(organizationId) {
    return await memberRepository.getMemberStats(organizationId);
  }
}

module.exports = new MemberService();
