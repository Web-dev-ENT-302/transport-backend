const express = require('express');
const router = express.Router();

// driver test route
router.get('/test', (req, res) => {
  res.json({ message: 'Driver routes working!' });
});

module.exports = router;
