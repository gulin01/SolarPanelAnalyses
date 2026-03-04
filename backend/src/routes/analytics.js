const { Router } = require('express');
const analyticsController = require('../controllers/analyticsController');

const router = Router();

router.get('/summary', analyticsController.getSummary);
router.get('/energy-output', analyticsController.getEnergyOutput);
router.get('/efficiency', analyticsController.getEfficiency);

module.exports = router;
