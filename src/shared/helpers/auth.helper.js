const { getAuth } = require("@clerk/express");

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

module.exports = { getOrgId, requireOrgId };
