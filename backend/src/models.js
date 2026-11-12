const mongoose = require('mongoose');
const { Schema, model } = mongoose;
const ref = (name) => ({ type: Schema.Types.ObjectId, ref: name, required: true });

const CATEGORIES = ['Electronics', 'Books', 'Clothing', 'Stationery', 'Sports', 'ID & Cards', 'Other'];

const User = model('User', new Schema({
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  passwordHash: { type: String, required: true },
  role: { type: String, enum: ['student', 'admin'], default: 'student' },
}, { timestamps: true }));

const Listing = model('Listing', new Schema({
  type: { type: String, enum: ['lost', 'found', 'borrow'], required: true },
  title: { type: String, required: true, trim: true, maxlength: 100 },
  description: { type: String, required: true, trim: true, maxlength: 1000 },
  category: { type: String, enum: CATEGORIES, default: 'Other' },
  date: { type: Date, default: Date.now },
  location: { type: String, trim: true, maxlength: 100 },
  imageUrl: String,
  status: { type: String, enum: ['open', 'claimed', 'resolved', 'borrowed', 'returned'], default: 'open' },
  owner: ref('User'),
  isReported: { type: Boolean, default: false },
  reportReason: String,
}, { timestamps: true }));

const Request = model('Request', new Schema({
  listing: ref('Listing'),
  requester: ref('User'),
  owner: ref('User'),
  message: { type: String, trim: true, maxlength: 500 },
  status: { type: String, enum: ['pending', 'accepted', 'rejected', 'completed'], default: 'pending' },
  returnDate: Date,
}, { timestamps: true }));

module.exports = { User, Listing, Request, CATEGORIES };
