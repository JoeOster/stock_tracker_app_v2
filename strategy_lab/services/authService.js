const jwt = require('jsonwebtoken');

function authenticateToken(req, res, next) {
  // If authentication is disabled, proceed without token validation
  if (process.env.ENABLE_AUTH !== 'true') {
    // For development, if auth is disabled, use X-User-Id header
    if (req.headers['x-user-id']) {
      req.user = { id: req.headers['x-user-id'] };
      return next();
    }
    // If no X-User-Id, and auth is disabled, still proceed (e.g., for public routes)
    return next();
  }

  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (token == null) return res.sendStatus(401); // No token provided

  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, user) => {
    if (err) return res.sendStatus(403); // Token is no longer valid
    req.user = user;
    next();
  });
}

module.exports = { authenticateToken };
