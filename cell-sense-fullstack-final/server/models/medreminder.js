module.exports = (sequelize, DataTypes) => {
  return sequelize.define("MedReminder", {
    name: { type: DataTypes.STRING, allowNull: false },
    dose: { type: DataTypes.STRING },
    time: { type: DataTypes.STRING, allowNull: false }
  });
};