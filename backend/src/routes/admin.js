const router = require('express').Router();
const { Listing } = require('../models');
const { protect, adminOnly } = require('../middleware/auth');

router.use(protect, adminOnly);
router.get('/reported', async (req, res) => res.json(await Listing.find({ isReported: true }).populate('owner', 'name email')));
router.patch('/dismiss/:id', async (req, res) => {
  await Listing.findByIdAndUpdate(req.params.id, { isReported: false, reportReason: undefined });
  res.json({ message: 'Report dismissed' });
});
module.exports = router;
