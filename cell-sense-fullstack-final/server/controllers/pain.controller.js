const db = require('../models');
const PainLog = db.PainLog;

exports.logPain = async (req, res) => {
  const { intensity, note } = req.body;
  const log = await PainLog.create({ intensity, note, UserId: req.userId });
  res.status(201).json(log);
};

exports.getPainLogs = async (req, res) => {
  const logs = await PainLog.findAll({
    where: { UserId: req.userId },
    order: [['createdAt', 'DESC']],
    limit: 10
  });
  res.json(logs);
};
