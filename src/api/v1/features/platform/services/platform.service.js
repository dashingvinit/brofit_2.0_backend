const { clerkClient } = require("@clerk/express");
const platformRepository = require("../repositories/platform.repository");
const { createError } = require("../../../../../shared/helpers/subscription.helper");
const config = require("../../../../../config/env.config");

class PlatformService {
  /**
   * Clerk is the source of truth for org existence.
   * Fetches all orgs from Clerk, auto-creates any missing DB records,
   * then returns DB records (which include _count relations).
   */
  /**
   * Clerk is the source of truth for org existence and display name.
   * - Auto-creates DB records for any Clerk org not yet in DB
   * - Corrects stale names (old auto-create used the slug instead of the display name)
   * - Returns only orgs that exist in Clerk (ignores orphaned DB records)
   */
  async listOrgs() {
    const { data: clerkOrgs } = await clerkClient.organizations.getOrganizationList({ limit: 500 });

    if (clerkOrgs.length === 0) return [];

    const dbOrgs = await platformRepository.listOrgs();
    const dbOrgMap = new Map(dbOrgs.map((o) => [o.id, o]));

    await Promise.all(
      clerkOrgs.map((co) => {
        const existing = dbOrgMap.get(co.id);
        if (!existing) {
          // Create missing DB record
          return platformRepository.createOrg({
            id: co.id,
            name: co.name,
            ownerUserId: co.createdBy ?? "unknown",
          });
        }
        if (existing.name !== co.name) {
          // Correct stale name (was stored as slug)
          return platformRepository.updateOrg(co.id, { name: co.name });
        }
        return null;
      }),
    );

    // Re-fetch to get fresh names + _count
    const updated = await platformRepository.listOrgs();

    // Return only orgs that exist in Clerk (filter out any orphaned DB records)
    const clerkOrgIds = new Set(clerkOrgs.map((co) => co.id));
    return updated.filter((o) => clerkOrgIds.has(o.id));
  }

  async getOrg(orgId) {
    let org = await platformRepository.getOrgById(orgId);

    // If not in DB, try to pull from Clerk and auto-create
    if (!org) {
      let clerkOrg;
      try {
        clerkOrg = await clerkClient.organizations.getOrganization(orgId);
      } catch {
        throw createError("Organization not found", 404);
      }
      org = await platformRepository.createOrg({
        id: clerkOrg.id,
        name: clerkOrg.name,
        ownerUserId: clerkOrg.createdBy ?? "unknown",
      });
      // Re-fetch to get _count
      org = await platformRepository.getOrgById(orgId);
    }

    const stats = await platformRepository.getOrgStats(orgId);
    return { ...org, stats };
  }

  /**
   * Creates an org in Clerk (super admin becomes initial creator/admin),
   * syncs the record to the DB, then immediately invites the gym owner
   * if an ownerEmail is provided.
   */
  async createOrg({ name, ownerEmail, creatorUserId }) {
    // Create in Clerk — creatorUserId is added as org:admin automatically
    const clerkOrg = await clerkClient.organizations.createOrganization({
      name,
      createdBy: creatorUserId,
    });

    // Sync to DB
    const org = await platformRepository.createOrg({
      id: clerkOrg.id,
      name: clerkOrg.name,
      ownerUserId: creatorUserId, // updated once actual owner onboards
    });

    // Optionally send invite to the gym owner right away
    if (ownerEmail) {
      await clerkClient.organizations.createOrganizationInvitation({
        organizationId: clerkOrg.id,
        emailAddress: ownerEmail,
        role: "org:admin",
        redirectUrl: config.cors.clientUrl,
      });
    }

    return org;
  }

  async updateOrg(orgId, { name }) {
    const org = await platformRepository.getOrgById(orgId);
    if (!org) throw createError("Organization not found", 404);

    await clerkClient.organizations.updateOrganization(orgId, { name });
    return await platformRepository.updateOrg(orgId, { name });
  }

  async setOrgStatus(orgId, isActive) {
    const org = await platformRepository.getOrgById(orgId);
    if (!org) throw createError("Organization not found", 404);
    return await platformRepository.setOrgActive(orgId, isActive);
  }

  async deleteOrg(orgId) {
    const org = await platformRepository.getOrgById(orgId);
    if (!org) throw createError("Organization not found", 404);

    // Delete all DB data first, then remove from Clerk
    await platformRepository.deleteOrgData(orgId);
    await clerkClient.organizations.deleteOrganization(orgId);
  }

  /**
   * Invites a user to an org by email.
   * Defaults to org:admin (gym owner), but can invite org:staff too.
   */
  async inviteToOrg(orgId, { emailAddress, role = "org:admin" }) {
    const org = await platformRepository.getOrgById(orgId);
    if (!org) throw createError("Organization not found", 404);

    return await clerkClient.organizations.createOrganizationInvitation({
      organizationId: orgId,
      emailAddress,
      role,
      redirectUrl: config.cors.clientUrl,
    });
  }

  /**
   * Lists all pending invitations for an org.
   */
  async listInvitations(orgId) {

    const { data } = await clerkClient.organizations.getOrganizationInvitationList({
      organizationId: orgId,
    });
    return data;
  }

  /**
   * Lists all members (and their roles) for an org from Clerk.
   */
  async listOrgMembers(orgId) {

    const { data } = await clerkClient.organizations.getOrganizationMembershipList({
      organizationId: orgId,
    });
    return data;
  }
}

module.exports = new PlatformService();
