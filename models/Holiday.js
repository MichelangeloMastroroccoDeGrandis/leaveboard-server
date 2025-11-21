import mongoose from 'mongoose';

const holidaySchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  date: { type: Date, required: true },
}, {
  timestamps: true,
});

holidaySchema.set('toJSON', {
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

holidaySchema.set('toObject', {
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

export default mongoose.model('Holiday', holidaySchema);
