const db = require('../models');
const User = db.User;

exports.getProfile = async (req, res) => {
  const user = await User.findByPk(req.userId);
  if (!user) return res.status(404).json({ message: 'User not found' });
  res.json(user);
};

exports.updateProfile = async (req, res) => {
  const { name, email, password } = req.body;
  await User.update({ name, email, password }, { where: { id: req.userId } });
  res.json({ message: 'Profile updated' });
};

exports.uploadProfilePic = async (req, res) => {
  const profilePic = '/uploads/' + req.file.filename;
  await User.update({ profilePic }, { where: { id: req.userId } });
  res.json({ message: 'Profile picture updated', profilePic });
};
