const db = require('../models');
const MedReminder = db.MedReminder;

exports.addReminder = async (req, res) => {
  const { name, dose, time } = req.body;
  const med = await MedReminder.create({ name, dose, time, UserId: req.userId });
  res.status(201).json(med);
};

exports.getReminders = async (req, res) => {
  const meds = await MedReminder.findAll({
    where: { UserId: req.userId },
    order: [['createdAt', 'DESC']]
  });
  res.json(meds);
};
