const router = require('express').Router();
const { Listing, Request, CATEGORIES } = require('../models');
const { protect } = require('../middleware/auth');

const s = (v) => (typeof v === 'string' ? v.trim() : '');
const esc = (v) => v.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const bad = (m) => Object.assign(new Error(m), { status: 400 });
const TYPES = ['lost', 'found', 'borrow'];

// Validate and sanitise listing input. Only whitelisted fields are ever returned.
function clean(b) {
  const d = {};
  if (b.type !== undefined) { if (!TYPES.includes(b.type)) throw bad('Invalid listing type'); d.type = b.type; }
  if (b.title !== undefined) { const t = s(b.title); if (!t || t.length > 100) throw bad('Title is required (max 100 characters)'); d.title = t; }
  if (b.description !== undefined) { const t = s(b.description); if (!t || t.length > 1000) throw bad('Description is required (max 1000 characters)'); d.description = t; }
  if (b.category !== undefined) { if (!CATEGORIES.includes(b.category)) throw bad('Invalid category'); d.category = b.category; }
  if (b.location !== undefined) d.location = s(b.location).slice(0, 100);
  if (b.date) { const dt = new Date(b.date); if (isNaN(dt)) throw bad('Invalid date'); d.date = dt; }
  if (b.imageUrl) { const u = s(b.imageUrl); if (!/^https:\/\/\S+$/.test(u) || u.length > 500) throw bad('Invalid image URL'); d.imageUrl = u; }
  if (b.status !== undefined) { if (!['open', 'resolved', 'returned'].includes(b.status)) throw bad('Invalid status'); d.status = b.status; }
  return d;
}

router.get('/', async (req, res) => {
  const q = s(req.query.q).slice(0, 100);
  const filter = {};
  for (const k of ['type', 'category', 'status']) if (s(req.query[k])) filter[k] = s(req.query[k]);
  if (q) filter.$or = [{ title: new RegExp(esc(q), 'i') }, { description: new RegExp(esc(q), 'i') }];
  res.json(await Listing.find(filter).sort('-createdAt').limit(100).populate('owner', 'name'));
});

router.get('/mine', protect, async (req, res) => {
  res.json(await Listing.find({ owner: req.user._id }).sort('-createdAt'));
});

router.get('/:id', async (req, res) => {
  const l = await Listing.findById(req.params.id).populate('owner', 'name');
  if (!l) return res.status(404).json({ message: 'Listing not found' });
  res.json(l);
});

router.post('/', protect, async (req, res) => {
  const d = clean(req.body);
  delete d.status;
  if (!d.type || !d.title || !d.description) throw bad('Type, title and description are required');
  res.status(201).json(await Listing.create({ ...d, owner: req.user._id }));
});

router.put('/:id', protect, async (req, res) => {
  const l = await Listing.findById(req.params.id);
  if (!l) return res.status(404).json({ message: 'Listing not found' });
  if (!l.owner.equals(req.user._id)) return res.status(403).json({ message: 'You can only edit your own listings' });
  const d = clean(req.body);
  if (d.status && ['claimed', 'borrowed'].includes(l.status))
    throw bad('Complete or reject the active request first');
  Object.assign(l, d);
  await l.save();
  await l.populate('owner', 'name');
  res.json(l);
});

router.delete('/:id', protect, async (req, res) => {
  const l = await Listing.findById(req.params.id);
  if (!l) return res.status(404).json({ message: 'Listing not found' });
  if (!l.owner.equals(req.user._id) && req.user.role !== 'admin')
    return res.status(403).json({ message: 'You can only delete your own listings' });
  await Request.deleteMany({ listing: l._id });
  await l.deleteOne();
  res.json({ message: 'Deleted' });
});

router.post('/:id/report', protect, async (req, res) => {
  const l = await Listing.findByIdAndUpdate(req.params.id,
    { isReported: true, reportReason: s(req.body.reason).slice(0, 300) || 'No reason given' });
  if (!l) return res.status(404).json({ message: 'Listing not found' });
  res.json({ message: 'Reported. An admin will review it.' });
});

module.exports = router;
