// Demo data. Run: npm run seed   (add -- --reset to wipe everything first)
require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const { User, Listing, Request } = require('./models');

(async () => {
  await mongoose.connect(process.env.MONGO_URI);
  if (process.argv.includes('--reset')) await Promise.all([User.deleteMany(), Listing.deleteMany(), Request.deleteMany()]);
  const passwordHash = await bcrypt.hash('Demo@1234', 10);
  const mk = async (name, email, role = 'student') => (await User.findOne({ email })) || User.create({ name, email, passwordHash, role });
  await mk('Campus Admin', 'admin@campusloop.test', 'admin');
  const mohit = await mk('Mohit Raj', 'mohit@campusloop.test');
  const manas = await mk('Manas Doshi', 'manas@campusloop.test');
  if (!(await Listing.countDocuments())) {
    await Listing.insertMany([
      { type: 'lost', title: 'Casio fx-991EX calculator', description: 'Black scientific calculator with my initials MR on the back. Lost after the maths exam.', category: 'Electronics', location: 'Block C, Room 204', owner: mohit._id },
      { type: 'found', title: 'Blue water bottle', description: 'Found near the library entrance. Steel bottle with a sticker of a mountain.', category: 'Other', location: 'Library', owner: manas._id },
      { type: 'borrow', title: 'Lab coat (size M)', description: 'Clean lab coat available for a day or two. Please return washed.', category: 'Clothing', location: 'Hostel B', owner: manas._id },
      { type: 'borrow', title: 'Umbrella', description: 'Large black umbrella, free to borrow during the rains.', category: 'Other', location: 'Main gate', owner: mohit._id },
      { type: 'found', title: 'Student ID card', description: 'ID card found in the cafeteria. Contact me with the name on the card.', category: 'ID & Cards', location: 'Cafeteria', owner: mohit._id },
    ]);
  }
  console.log('Seeded. Demo logins (password Demo@1234): admin@campusloop.test, mohit@campusloop.test, manas@campusloop.test');
  await mongoose.disconnect();
})().catch((e) => { console.error(e.message); process.exit(1); });
