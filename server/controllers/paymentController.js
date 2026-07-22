const crypto = require('crypto');
const razorpayInstance = require('../config/razorpay');
const Order = require('../models/Order');
const InventoryItem = require('../models/InventoryItem');
const sendEmail = require('../utils/sendEmail');
const User = require('../models/User');

// @route  POST /api/payments/create-razorpay-order
// User — takes our existing order's ID, creates a matching Razorpay order
const createRazorpayOrder = async (req, res, next) => {
  try {
    const { orderId } = req.body;

    const order = await Order.findOne({ _id: orderId, user: req.user._id });

    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    if (order.paymentStatus === 'paid') {
      return res.status(400).json({ success: false, message: 'This order is already paid' });
    }

    // Razorpay expects amount in paise (smallest currency unit), not rupees
    const razorpayOrder = await razorpayInstance.orders.create({
      amount: order.totalAmount * 100,
      currency: 'INR',
      receipt: order._id.toString(),
    });

    order.razorpayOrderId = razorpayOrder.id;
    await order.save();

    res.status(200).json({
      success: true,
      razorpayOrderId: razorpayOrder.id,
      amount: razorpayOrder.amount,
      currency: razorpayOrder.currency,
      keyId: process.env.RAZORPAY_KEY_ID,
    });
  } catch (error) {
    next(error);
  }
};

// @route  POST /api/payments/verify
// User — verifies Razorpay's payment signature, then marks the order as paid + decrements inventory
const verifyPayment = async (req, res, next) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({ success: false, message: 'Missing payment verification details' });
    }

    // Recreate the expected signature ourselves, using our secret key
    const generatedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest('hex');

    if (generatedSignature !== razorpay_signature) {
      return res.status(400).json({ success: false, message: 'Payment verification failed — signature mismatch' });
    }

    // Signature is valid — find our order by the Razorpay order ID we saved earlier
    const order = await Order.findOne({ razorpayOrderId: razorpay_order_id, user: req.user._id });

    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    if (order.paymentStatus === 'paid') {
      return res.status(200).json({ success: true, message: 'Order already confirmed', order });
    }

    // Decrement inventory for each item in this order
    for (const item of order.items) {
      if (item.itemType === 'custom') {
        const { base, sauce, cheese, vegetables } = item.customDetails;

        await InventoryItem.updateOne({ category: 'base', name: base }, { $inc: { quantity: -item.quantity } });
        await InventoryItem.updateOne({ category: 'sauce', name: sauce }, { $inc: { quantity: -item.quantity } });
        await InventoryItem.updateOne({ category: 'cheese', name: cheese }, { $inc: { quantity: -item.quantity } });

        for (const veg of vegetables) {
          await InventoryItem.updateOne({ category: 'vegetable', name: veg }, { $inc: { quantity: -item.quantity } });
        }
      }
      // Note: preset pizza items don't decrement raw inventory directly in this simplified model —
      // see the explanation below this code block
    }

    order.paymentStatus = 'paid';
    order.razorpayPaymentId = razorpay_payment_id;
    order.orderStatus = 'Order Received';
    order.statusUpdatedAt = new Date();
    await order.save();

    // Send order confirmation email (non-blocking — don't fail the response if email fails)
    try {
      const user = await User.findById(order.user);
      const itemsHtml = order.items
        .map((item) => `<li>${item.name} × ${item.quantity} — ₹${item.unitPrice * item.quantity}</li>`)
        .join('');

      await sendEmail({
        to: user.email,
        subject: `SliceHouse — Order Confirmed (#${order._id.toString().slice(-6).toUpperCase()})`,
        html: `
          <p>Hi ${user.name},</p>
          <p>Your order has been confirmed and is being prepared.</p>
          <ul>${itemsHtml}</ul>
          <p><b>Total paid: ₹${order.totalAmount}</b></p>
          <p>Delivering to: ${order.deliveryAddress.addressLine}, ${order.deliveryAddress.city}</p>
        `,
      });
    } catch (emailError) {
      console.error('Failed to send order confirmation email:', emailError.message);
    }

    res.status(200).json({ success: true, message: 'Payment verified, order confirmed', order });
  } catch (error) {
    next(error);
  }
};

// @route  POST /api/payments/webhook
// Razorpay → our server directly. Independent safety net in case the frontend never calls /verify
// (e.g. browser crash right after payment success)
const razorpayWebhook = async (req, res, next) => {
  try {
    const webhookSignature = req.headers['x-razorpay-signature'];

    const expectedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_WEBHOOK_SECRET)
      .update(req.body) // raw buffer, NOT parsed JSON — see routing step
      .digest('hex');

    if (expectedSignature !== webhookSignature) {
      console.error('[Webhook] Signature mismatch — rejecting');
      return res.status(400).json({ success: false, message: 'Invalid webhook signature' });
    }

    const payload = JSON.parse(req.body.toString());

    if (payload.event === 'payment.captured') {
      const razorpayOrderId = payload.payload.payment.entity.order_id;
      const razorpayPaymentId = payload.payload.payment.entity.id;

      const order = await Order.findOne({ razorpayOrderId });

      if (order && order.paymentStatus !== 'paid') {
        order.paymentStatus = 'paid';
        order.razorpayPaymentId = razorpayPaymentId;
        order.orderStatus = 'Order Received';
        order.statusUpdatedAt = new Date();
        await order.save();
        console.log(`[Webhook] Order ${order._id} confirmed as paid via webhook`);
      } else if (order) {
        console.log(`[Webhook] Order ${order._id} already marked paid — skipping duplicate`);
      } else {
        console.error(`[Webhook] No matching order found for razorpayOrderId ${razorpayOrderId}`);
      }
    }

    // Razorpay expects a 200 response quickly, or it will retry the webhook repeatedly
    res.status(200).json({ received: true });
  } catch (error) {
    console.error('[Webhook] Error processing webhook:', error.message);
    res.status(500).json({ success: false, message: 'Webhook processing failed' });
  }
};

module.exports = { createRazorpayOrder, verifyPayment, razorpayWebhook };