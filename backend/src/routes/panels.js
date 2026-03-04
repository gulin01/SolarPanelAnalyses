const { Router } = require('express');
const panelsController = require('../controllers/panelsController');

const router = Router();

router.get('/', panelsController.listPanels);
router.get('/:id', panelsController.getPanel);
router.post('/', panelsController.createPanel);
router.put('/:id', panelsController.updatePanel);
router.delete('/:id', panelsController.deletePanel);

module.exports = router;
