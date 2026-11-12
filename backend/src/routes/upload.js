const router = require('express').Router();
const multer = require('multer');
const { v2: cloudinary } = require('cloudinary');
const { protect } = require('../middleware/auth');

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 2 * 1024 * 1024 },
  fileFilter: (req, file, cb) =>
    file.mimetype.startsWith('image/') ? cb(null, true) : cb(Object.assign(new Error('Only images are allowed'), { status: 400 })),
});

router.post('/', protect, upload.single('image'), async (req, res) => {
  if (!process.env.CLOUDINARY_CLOUD_NAME) return res.status(503).json({ message: 'Image upload is not configured' });
  if (!req.file) return res.status(400).json({ message: 'No image received' });
  const url = await new Promise((ok, fail) =>
    cloudinary.uploader.upload_stream({ folder: 'campusloop' }, (e, r) => (e ? fail(e) : ok(r.secure_url))).end(req.file.buffer));
  res.json({ url });
});
module.exports = router;
