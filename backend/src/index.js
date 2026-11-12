const mongoose = require('mongoose');
const app = require('./app');

for (const k of ['MONGO_URI', 'JWT_SECRET']) {
  if (!process.env[k]) { console.error(`Missing ${k}. Copy .env.example to .env and fill it in.`); process.exit(1); }
}
const PORT = process.env.PORT || 5000;
mongoose.connect(process.env.MONGO_URI)
  .then(() => app.listen(PORT, () => console.log(`CampusLoop API running on port ${PORT}`)))
  .catch((e) => { console.error('MongoDB connection failed:', e.message); process.exit(1); });
