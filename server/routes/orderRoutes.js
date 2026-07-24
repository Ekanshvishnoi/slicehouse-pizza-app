const express = require('express');
const router = express.Router();

const {
  previewOrder,
  createOrder,
  updateOrderStatus,
  getAllOrdersAdmin,
  getOrderStatus,
  getActiveOrders,
  getOrderHistory,
  cancelOrder,
} = require('../controllers/orderController');

const { protect, isAdmin } = require('../middleware/authMiddleware');

// All order routes require a logged-in user at minimum
router.use(protect);

// Admin-only routes
router.get('/admin/all', isAdmin, getAllOrdersAdmin);
router.put('/:id/status', isAdmin, updateOrderStatus);

// User routes
router.post('/preview', previewOrder);
router.post('/', createOrder);
router.get('/active', getActiveOrders);
router.get('/history', getOrderHistory);
router.get('/:id/status', getOrderStatus);
router.put('/:id/cancel', cancelOrder);

module.exports = router;