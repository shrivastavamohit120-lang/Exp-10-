const jwt = require('jsonwebtoken');
const { User } = require('../models');

exports.protect = async (req, res, next) => {
  const h = req.headers.authorization || '';
  if (!h.startsWith('Bearer ')) return res.status(401).json({ message: 'Please log in' });
  try {
    const { id } = jwt.verify(h.slice(7), process.env.JWT_SECRET);
    req.user = await User.findById(id);
    if (!req.user) throw new Error('no user');
    next();
  } catch {
    res.status(401).json({ message: 'Session expired, please log in again' });
  }
};
exports.adminOnly = (req, res, next) =>
  req.user.role === 'admin' ? next() : res.status(403).json({ message: 'Admins only' });
