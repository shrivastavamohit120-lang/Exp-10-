const router = require('express').Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { User } = require('../models');
const { protect } = require('../middleware/auth');

const str = (v) => (typeof v === 'string' ? v.trim() : '');
const sign = (u) => jwt.sign({ id: u._id }, process.env.JWT_SECRET, { expiresIn: '7d' });
const pub = (u) => ({ id: u._id, name: u.name, email: u.email, role: u.role });
const bad = (res, message) => res.status(400).json({ message });

router.post('/register', async (req, res) => {
  const name = str(req.body.name);
  const email = str(req.body.email).toLowerCase();
  const password = typeof req.body.password === 'string' ? req.body.password : '';
  if (name.length < 2 || name.length > 50) return bad(res, 'Enter your name (2 to 50 characters)');
  if (!/^\S+@\S+\.\S+$/.test(email) || email.length > 100) return bad(res, 'Enter a valid email address');
  if (password.length < 6 || password.length > 72) return bad(res, 'Password must be 6 to 72 characters');
  if (await User.findOne({ email })) return res.status(409).json({ message: 'This email is already registered' });
  const role = process.env.ADMIN_EMAIL && email === process.env.ADMIN_EMAIL.toLowerCase() ? 'admin' : 'student';
  const user = await User.create({ name, email, passwordHash: await bcrypt.hash(password, 10), role });
  res.status(201).json({ token: sign(user), user: pub(user) });
});

router.post('/login', async (req, res) => {
  const email = str(req.body.email).toLowerCase();
  const password = typeof req.body.password === 'string' ? req.body.password : '';
  if (!email || !password) return bad(res, 'Enter your email and password');
  const user = await User.findOne({ email });
  if (!user || !(await bcrypt.compare(password, user.passwordHash)))
    return res.status(401).json({ message: 'Incorrect email or password' });
  res.json({ token: sign(user), user: pub(user) });
});

router.get('/me', protect, (req, res) => res.json(pub(req.user)));
module.exports = router;
