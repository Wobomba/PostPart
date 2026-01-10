module.exports = (sequelize, DataTypes) => {
  return sequelize.define("PainLog", {
    intensity: { type: DataTypes.INTEGER, allowNull: false },
    note: { type: DataTypes.STRING }
  });
};