import Holiday from '../models/Holiday.js';

export const listHolidays = async (req, res) => {
  try {
    const holidays = await Holiday.find().sort({ date: 1 });
    res.json(holidays);
  } catch (err) {
    console.error('[HOLIDAYS] Error listing holidays:', err);
    res.status(500).json({ message: 'Failed to fetch holidays' });
  }
};

export const createHoliday = async (req, res) => {
  try {
    const { name, date } = req.body;

    if (!name || !date) {
      return res.status(400).json({ message: 'Name and date are required' });
    }

    const existing = await Holiday.findOne({ date: new Date(date) });
    if (existing) {
      return res.status(400).json({ message: 'A holiday already exists on this date' });
    }

    const holiday = await Holiday.create({ name, date });
    res.status(201).json(holiday);
  } catch (err) {
    console.error('[HOLIDAYS] Error creating holiday:', err);
    res.status(500).json({ message: 'Failed to create holiday' });
  }
};

export const updateHoliday = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, date } = req.body;

    if (!name || !date) {
      return res.status(400).json({ message: 'Name and date are required' });
    }

    const holiday = await Holiday.findById(id);
    if (!holiday) {
      return res.status(404).json({ message: 'Holiday not found' });
    }

    holiday.name = name;
    holiday.date = date;
    await holiday.save();

    res.json(holiday);
  } catch (err) {
    console.error('[HOLIDAYS] Error updating holiday:', err);
    res.status(500).json({ message: 'Failed to update holiday' });
  }
};

export const deleteHoliday = async (req, res) => {
  try {
    const { id } = req.params;

    const holiday = await Holiday.findById(id);
    if (!holiday) {
      return res.status(404).json({ message: 'Holiday not found' });
    }

    await holiday.deleteOne();
    res.json({ message: 'Holiday deleted', id });
  } catch (err) {
    console.error('[HOLIDAYS] Error deleting holiday:', err);
    res.status(500).json({ message: 'Failed to delete holiday' });
  }
};
