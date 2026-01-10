const express = require('express');
const router = express.Router();
const pain = require('../controllers/pain.controller');
const auth = require('../middleware/auth.middleware');

router.post('/', auth, pain.logPain);
router.get('/', auth, pain.getPainLogs);

module.exports = router;
