const requireAuth = () => {
  return (req, res, next) => {
    if (!req.auth?.userId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }
    next();
  };
};

module.exports = { requireAuth };
