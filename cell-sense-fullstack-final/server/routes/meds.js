const express = require('express');
const router = express.Router();
const med = require('../controllers/med.controller');
const auth = require('../middleware/auth.middleware');

router.post('/', auth, med.addReminder);
router.get('/', auth, med.getReminders);

module.exports = router;
