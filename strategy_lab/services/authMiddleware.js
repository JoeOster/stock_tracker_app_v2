require('dotenv').config();
const jwt = require('jsonwebtoken');

const authenticateToken = (req, res, next) => {
  if (process.env.ENABLE_AUTH === 'false') {
    const userId = req.headers['x-user-id'];
    if (userId) {
      req.user = { id: userId, username: 'dev_user' }; // Mock user for development
      return next();
    } else {
      return res
        .status(401)
        .json({ message: 'X-User-Id header required for development mode.' });
    }
  }

  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (token == null) return res.sendStatus(401); // No token

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) return res.sendStatus(403); // Invalid token
    req.user = user;
    next();
  });
};

module.exports = authenticateToken;
