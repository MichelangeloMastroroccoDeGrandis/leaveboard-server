import mongoose from 'mongoose';

const wfhRequestSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  type: { type: String, enum: ['wfh', 'sick', 'timeoff'], required: true },
  date: { type: Date, required: true },
  status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
  motivation: { type: String },
  createdAt: { type: Date, default: Date.now }
});

// Ensure date serializes as YYYY-MM-DD (no time) in API responses
wfhRequestSchema.set('toJSON', {
  transform: (doc, ret) => {
    if (ret.date) {
      try {
        ret.date = new Date(ret.date).toISOString().slice(0, 10);
      } catch (_) {
        // leave as-is if parsing fails
      }
    }
    return ret;
  },
});

wfhRequestSchema.set('toObject', {
  transform: (doc, ret) => {
    if (ret.date) {
      try {
        ret.date = new Date(ret.date).toISOString().slice(0, 10);
      } catch (_) {
        // leave as-is if parsing fails
      }
    }
    return ret;
  },
});

export default mongoose.model('WfhRequest', wfhRequestSchema);
