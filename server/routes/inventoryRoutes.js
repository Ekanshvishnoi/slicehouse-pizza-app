const express = require('express');
const router = express.Router();

const {
  getInventory,
  getInventorySummary,
  createInventoryItem,
  updateInventoryItem,
  deleteInventoryItem,
} = require('../controllers/inventoryController');

const { protect, isAdmin } = require('../middleware/authMiddleware');

// All inventory routes are admin-only — customers never see raw stock numbers
router.use(protect, isAdmin);

router.get('/summary', getInventorySummary);
router.get('/', getInventory);
router.post('/', createInventoryItem);
router.put('/:id', updateInventoryItem);
router.delete('/:id', deleteInventoryItem);

module.exports = router;