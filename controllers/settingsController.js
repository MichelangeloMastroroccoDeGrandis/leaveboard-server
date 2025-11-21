import WfhSettings from '../models/WfhSettings.js';

const getOrCreateSettings = async () => {
  let doc = await WfhSettings.findOne();
  if (!doc) {
    doc = await WfhSettings.create({});
  }
  return doc;
};

export const getWfhSettings = async (req, res) => {
  try {
    const settings = await getOrCreateSettings();
    res.json(settings);
  } catch (err) {
    console.error('[SETTINGS] Error fetching WFH settings:', err);
    res.status(500).json({ message: 'Failed to fetch WFH settings' });
  }
};

export const updateWfhSettings = async (req, res) => {
  try {
    const settings = await getOrCreateSettings();

    const { allowedDateScopes, disallowedWeekdays, positionConcurrency } = req.body || {};

    if (allowedDateScopes && typeof allowedDateScopes === 'object') {
      settings.allowedDateScopes.thisWeek = !!allowedDateScopes.thisWeek;
      settings.allowedDateScopes.nextWeek = !!allowedDateScopes.nextWeek;
      settings.allowedDateScopes.withinMonth = !!allowedDateScopes.withinMonth;
    }

    if (Array.isArray(disallowedWeekdays)) {
      settings.disallowedWeekdays = disallowedWeekdays
        .map((n) => Number(n))
        .filter((n) => !Number.isNaN(n) && n >= 0 && n <= 6);
    }

    if (positionConcurrency && typeof positionConcurrency === 'object') {
      Object.entries(positionConcurrency).forEach(([position, value]) => {
        const num = Number(value);
        if (!Number.isNaN(num) && num >= 0) {
          settings.positionConcurrency.set(position, num);
        }
      });
    }

    await settings.save();
    res.json(settings);
  } catch (err) {
    console.error('[SETTINGS] Error updating WFH settings:', err);
    res.status(500).json({ message: 'Failed to update WFH settings' });
  }
};
