const express = require('express');
const router = express.Router();
const { getBuilderOptions } = require('../controllers/builderController');

router.get('/options', getBuilderOptions);

module.exports = router;