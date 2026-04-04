const { getAuth, clerkClient } = require("@clerk/express");
const { prisma } = require("../../config/prisma.config");

/**
 * Extracts orgId from Clerk auth on the request.
 * Returns orgId string or undefined.
 */
function getOrgId(req) {
  const auth = getAuth(req);
  return auth.orgId || auth.sessionClaims?.org_id;
}

/**
 * Extracts orgId and sends 400 if missing.
 * Returns orgId string or null (if response was already sent).
 */
function requireOrgId(req, res) {
  const orgId = getOrgId(req);
  if (!orgId) {
    res
      .status(400)
      .json({ success: false, message: "Organization ID is required" });
    return null;
  }
  return orgId;
}

/**
 * Returns the user's org role (e.g. "org:admin", "org:staff", "org:member").
 */
function getOrgRole(req) {
  const auth = getAuth(req);
  return auth.orgRole || auth.sessionClaims?.org_role || null;
}

/**
 * Middleware — only allows requests from users with publicMetadata.role === "super_admin".
 * Use on platform-level routes (org management, etc.).
 */
async function requireSuperAdmin(req, res, next) {
  try {
    const auth = getAuth(req);
    if (!auth.userId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }
    // publicMetadata is not in the JWT by default — fetch directly from Clerk API
    const user = await clerkClient.users.getUser(auth.userId);
    const role = user.publicMetadata?.role;
    if (role !== "super_admin") {
      return res.status(403).json({ success: false, message: "Forbidden" });
    }
    next();
  } catch (err) {
    next(err);
  }
}

/**
 * Middleware — only allows org:admin role within an org.
 * Use on gym-admin-only routes as an extra server-side check.
 */
function requireOrgAdmin(req, res, next) {
  const role = getOrgRole(req);
  if (role !== "org:admin") {
    return res.status(403).json({ success: false, message: "Forbidden" });
  }
  next();
}

/**
 * Middleware — blocks requests to a frozen/suspended organization.
 * Skips if no orgId in the request (e.g. platform routes).
 */
async function requireActiveOrg(req, res, next) {
  try {
    const orgId = getOrgId(req);
    if (!orgId) return next();

    const org = await prisma.organization.findUnique({
      where: { id: orgId },
      select: { isActive: true },
    });

    if (org && !org.isActive) {
      return res.status(403).json({
        success: false,
        message: "This organization has been suspended. Contact support.",
      });
    }
    next();
  } catch (err) {
    next(err);
  }
}

module.exports = { getOrgId, requireOrgId, getOrgRole, requireSuperAdmin, requireOrgAdmin, requireActiveOrg };
