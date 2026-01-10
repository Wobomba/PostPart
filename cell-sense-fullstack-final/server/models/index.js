const { Sequelize, DataTypes } = require('sequelize');
require('dotenv').config();

const sequelize = new Sequelize({
  dialect: 'sqlite',
  storage: process.env.DB_STORAGE
});

const db = {};
db.sequelize = sequelize;
db.Sequelize = Sequelize;

db.User = require('./user')(sequelize, DataTypes);
db.PainLog = require('./painlog')(sequelize, DataTypes);
db.MedReminder = require('./medreminder')(sequelize, DataTypes);

// Associations
db.User.hasMany(db.PainLog);
db.PainLog.belongsTo(db.User);

db.User.hasMany(db.MedReminder);
db.MedReminder.belongsTo(db.User);

module.exports = db;
