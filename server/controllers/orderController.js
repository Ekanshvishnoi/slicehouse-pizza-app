const Order = require('../models/Order');
const { calculateCartTotals } = require('../utils/calculatePrice');
const InventoryItem = require('../models/InventoryItem');

// @route  POST /api/orders/preview
// User — calculates totals for a cart WITHOUT creating an order (used on the cart/summary screen)
const previewOrder = async (req, res, next) => {
  try {
    const { items } = req.body;

    if (!items || items.length === 0) {
      return res.status(400).json({ success: false, message: 'Cart is empty' });
    }

    const { processedItems, subtotal, deliveryFee, tax, totalAmount } = await calculateCartTotals(items);

    res.status(200).json({
      success: true,
      preview: { items: processedItems, subtotal, deliveryFee, tax, totalAmount },
    });
  } catch (error) {
    next(error);
  }
};

// @route  POST /api/orders
// User — creates an order in "pending payment" state, ready for Razorpay checkout
const createOrder = async (req, res, next) => {
  try {
    const { items, deliveryAddress } = req.body;

    if (!items || items.length === 0) {
      return res.status(400).json({ success: false, message: 'Cart is empty' });
    }
    if (!deliveryAddress || !deliveryAddress.addressLine) {
      return res.status(400).json({ success: false, message: 'Delivery address is required' });
    }

    const { processedItems, subtotal, deliveryFee, tax, totalAmount } = await calculateCartTotals(items);

    const order = await Order.create({
      user: req.user._id,
      items: processedItems,
      subtotal,
      deliveryFee,
      tax,
      totalAmount,
      deliveryAddress,
      paymentStatus: 'pending',
    });

    res.status(201).json({ success: true, order });
  } catch (error) {
    next(error);
  }
};

// Defines the only valid forward transitions — enforces our "no skipping stages" rule from the wireframe
const VALID_TRANSITIONS = {
  'Order Received': ['In Kitchen', 'Cancelled'],
  'In Kitchen': ['Sent to Delivery'],
  'Sent to Delivery': ['Delivered'],
  'Delivered': [],
  'Cancelled': [],
};

// @route  PUT /api/orders/:id/status
// Admin — updates an order's status, only allowing valid next steps
const updateOrderStatus = async (req, res, next) => {
  try {
    const { status } = req.body;
    const order = await Order.findById(req.params.id);

    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    if (order.paymentStatus !== 'paid') {
      return res.status(400).json({ success: false, message: 'Cannot update status of an unpaid order' });
    }

    const allowedNext = VALID_TRANSITIONS[order.orderStatus] || [];
    if (!allowedNext.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Cannot move from "${order.orderStatus}" to "${status}"`,
      });
    }

    order.orderStatus = status;
    order.statusUpdatedAt = new Date();
    await order.save();

    res.status(200).json({ success: true, order });
  } catch (error) {
    next(error);
  }
};

// @route  GET /api/orders/admin/all
// Admin — view all orders (for the order management panel), newest first
const getAllOrdersAdmin = async (req, res, next) => {
  try {
    const { status } = req.query;
    const filter = status ? { orderStatus: status } : {};

    const orders = await Order.find(filter)
      .populate('user', 'name email')
      .sort({ createdAt: -1 });

    res.status(200).json({ success: true, orders });
  } catch (error) {
    next(error);
  }
};

// @route  GET /api/orders/:id/status
// User — polling endpoint for a single order's live status (used by an individual floating pill)
const getOrderStatus = async (req, res, next) => {
  try {
    const order = await Order.findOne({ _id: req.params.id, user: req.user._id }).select(
      'orderStatus paymentStatus statusUpdatedAt totalAmount'
    );

    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    res.status(200).json({ success: true, order });
  } catch (error) {
    next(error);
  }
};

// @route  GET /api/orders/active
// User — all currently active (not yet Delivered/Cancelled) orders — powers the stacked bottom pills
const getActiveOrders = async (req, res, next) => {
  try {
    const orders = await Order.find({
      user: req.user._id,
      paymentStatus: 'paid',
      orderStatus: { $nin: ['Delivered', 'Cancelled'] },
    }).select('orderStatus statusUpdatedAt totalAmount items createdAt').sort({ createdAt: -1 });

    res.status(200).json({ success: true, orders });
  } catch (error) {
    next(error);
  }
};

// @route  GET /api/orders/history
// User — past orders (Delivered or Cancelled) for the Order History screen
const getOrderHistory = async (req, res, next) => {
  try {
    const orders = await Order.find({
      user: req.user._id,
      orderStatus: { $in: ['Delivered', 'Cancelled'] },
    })
      .populate('items.pizzaItem', 'name image')
      .sort({ createdAt: -1 });

    res.status(200).json({ success: true, orders });
  } catch (error) {
    next(error);
  }
};

// @route  PUT /api/orders/:id/cancel
// User — cancels their own order, only allowed while still "Order Received"
const cancelOrder = async (req, res, next) => {
  try {
    const order = await Order.findOne({ _id: req.params.id, user: req.user._id });

    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    if (order.orderStatus !== 'Order Received') {
      return res.status(400).json({
        success: false,
        message: 'This order can no longer be cancelled — it is already being prepared',
      });
    }

    order.orderStatus = 'Cancelled';
    order.statusUpdatedAt = new Date();
    await order.save();

    res.status(200).json({ success: true, message: 'Order cancelled', order });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  previewOrder,
  createOrder,
  updateOrderStatus,
  getAllOrdersAdmin,
  getOrderStatus,
  getActiveOrders,
  getOrderHistory,
  cancelOrder,
};