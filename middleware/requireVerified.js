/**
 * requireVerified middleware: blocks AI/document features until the account's
 * email address is verified. Must run after `auth`.
 */
module.exports = (req, res, next) => {
  if (!req.user || req.user.isVerified !== true) {
    return res.status(403).json({
      message: 'Email verification required before using this feature',
      requiresVerification: true,
    });
  }
  next();
};
