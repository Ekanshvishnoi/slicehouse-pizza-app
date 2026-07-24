const express = require('express');
const router = express.Router();

const {
  getActivePizzaItems,
  getAllPizzaItems,
  createPizzaItem,
  updatePizzaItem,
  deletePizzaItem,
} = require('../controllers/pizzaItemController');

const { protect, isAdmin } = require('../middleware/authMiddleware');
const upload = require('../middleware/uploadMiddleware');

// Public
router.get('/', getActivePizzaItems);

// Admin only
router.get('/admin', protect, isAdmin, getAllPizzaItems);
router.post('/', protect, isAdmin, upload.single('image'), createPizzaItem);
router.put('/:id', protect, isAdmin, upload.single('image'), updatePizzaItem);
router.delete('/:id', protect, isAdmin, deletePizzaItem);

module.exports = router;