const { getAuth } = require("@clerk/express");

const requireAuth = () => {
  return (req, res, next) => {
    const auth = getAuth(req);
    if (!auth.userId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }
    req.auth = auth;
    next();
  };
};

const checkRole = () => {
  return (_req, _res, next) => {
    next();
  };
};

module.exports = {
  requireAuth,
  checkRole,
};
