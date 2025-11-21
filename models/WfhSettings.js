import mongoose from 'mongoose';

const wfhSettingsSchema = new mongoose.Schema({
  allowedDateScopes: {
    thisWeek: { type: Boolean, default: false },
    nextWeek: { type: Boolean, default: true },
    withinMonth: { type: Boolean, default: false },
  },
  // 0 = Sunday ... 6 = Saturday
  disallowedWeekdays: {
    type: [Number],
    default: [1, 5, 0, 6], // Monday, Friday, weekend (keeps current behaviour by default)
  },
  // Map of position -> max concurrent WFH approvals per day (per position)
  positionConcurrency: {
    type: Map,
    of: Number,
    default: {},
  },
}, {
  timestamps: true,
});

const WfhSettings = mongoose.model('WfhSettings', wfhSettingsSchema);

export default WfhSettings;
