const express = require('express');
const router = express.Router();
const user = require('../controllers/user.controller');
const authMiddleware = require('../middleware/auth.middleware');
const multer = require('multer');
const path = require('path');

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'uploads/'),
  filename: (req, file, cb) => cb(null, req.userId + path.extname(file.originalname))
});
const upload = multer({ storage });

router.get('/me', authMiddleware, user.getProfile);
router.put('/me', authMiddleware, user.updateProfile);
router.post('/profile-pic', authMiddleware, upload.single('profilePic'), user.uploadProfilePic);

module.exports = router;
