import mongoose from 'mongoose';

const wfhRequestSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  type: { type: String, enum: ['wfh', 'sick', 'timeoff'], required: true },
  date: { type: Date, required: true },
  status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
  motivation: { type: String },
  createdAt: { type: Date, default: Date.now }
});

export default mongoose.model('WfhRequest', wfhRequestSchema);
