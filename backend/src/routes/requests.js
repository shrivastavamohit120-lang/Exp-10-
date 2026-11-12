const router = require('express').Router();
const { Listing, Request } = require('../models');
const { protect } = require('../middleware/auth');

router.use(protect);
const s = (v) => (typeof v === 'string' ? v.trim() : '');
const bad = (m, status = 400) => Object.assign(new Error(m), { status });

const list = async (filter) => {
  const rows = await Request.find(filter).sort('-createdAt')
    .populate('listing', 'title type status').populate('requester', 'name email').populate('owner', 'name email');
  // Contact emails are shared only after the owner accepts the request.
  return rows.map((r) => {
    const o = r.toObject();
    if (!['accepted', 'completed'].includes(o.status)) { if (o.requester) delete o.requester.email; if (o.owner) delete o.owner.email; }
    return o;
  });
};

router.post('/', async (req, res) => {
  const l = await Listing.findById(s(req.body.listingId));
  if (!l) return res.status(404).json({ message: 'Listing not found' });
  if (l.owner.equals(req.user._id)) throw bad('You cannot request your own listing');
  if (l.status !== 'open') throw bad('This listing is no longer open');
  if (await Request.findOne({ listing: l._id, requester: req.user._id, status: 'pending' }))
    throw bad('You already have a pending request for this item', 409);
  let returnDate;
  if (l.type === 'borrow') {
    returnDate = new Date(req.body.returnDate);
    const today = new Date(); today.setHours(0, 0, 0, 0);
    if (isNaN(returnDate) || returnDate < today) throw bad('Choose a return date from today onward');
  }
  const r = await Request.create({ listing: l._id, requester: req.user._id, owner: l.owner, message: s(req.body.message).slice(0, 500), returnDate });
  res.status(201).json(r);
});

router.get('/incoming', async (req, res) => res.json(await list({ owner: req.user._id })));
router.get('/outgoing', async (req, res) => res.json(await list({ requester: req.user._id })));

// action: accept | reject | complete (listing owner only)
router.patch('/:id', async (req, res) => {
  const r = await Request.findById(req.params.id);
  if (!r) return res.status(404).json({ message: 'Request not found' });
  if (!r.owner.equals(req.user._id)) return res.status(403).json({ message: 'Only the listing owner can do this' });
  const l = await Listing.findById(r.listing);
  if (!l) return res.status(404).json({ message: 'Listing no longer exists' });
  const action = s(req.body.action);
  if (action === 'accept' && r.status === 'pending' && l.status === 'open') {
    r.status = 'accepted';
    l.status = l.type === 'borrow' ? 'borrowed' : 'claimed';
    await Request.updateMany({ listing: l._id, status: 'pending', _id: { $ne: r._id } }, { status: 'rejected' });
  } else if (action === 'reject' && r.status === 'pending') {
    r.status = 'rejected';
  } else if (action === 'complete' && r.status === 'accepted') {
    r.status = 'completed';
    l.status = l.type === 'borrow' ? 'returned' : 'resolved';
  } else {
    throw bad(`Cannot ${action || 'update'} a ${r.status} request`);
  }
  await r.save(); await l.save();
  res.json(r);
});

module.exports = router;
