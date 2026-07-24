const mongoose = require('mongoose');

// One line item inside an order — either a preset pizza OR a custom-built one
const orderItemSchema = new mongoose.Schema({
  itemType: { type: String, enum: ['preset', 'custom'], required: true },

  // Only populated if itemType is 'preset'
  pizzaItem: { type: mongoose.Schema.Types.ObjectId, ref: 'PizzaItem' },

  // Only populated if itemType is 'custom'
  customDetails: {
    base: { type: String },
    sauce: { type: String },
    cheese: { type: String },
    vegetables: [{ type: String }],
  },

  name: { type: String, required: true }, // snapshot label, e.g. "Margherita classic" or "Custom pizza"
  quantity: { type: Number, required: true, min: 1, default: 1 },
  unitPrice: { type: Number, required: true }, // price at time of order (snapshot, not live-linked)
}, { _id: false });

const orderSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },

  items: [orderItemSchema],

  subtotal: { type: Number, required: true },
  deliveryFee: { type: Number, required: true, default: 25 },
  tax: { type: Number, required: true },
  totalAmount: { type: Number, required: true },

  deliveryAddress: {
    label: String,
    addressLine: String,
    city: String,
    pincode: String,
  },

  paymentStatus: {
    type: String,
    enum: ['pending', 'paid', 'failed'],
    default: 'pending',
  },
  razorpayOrderId: { type: String },
  razorpayPaymentId: { type: String },

  orderStatus: {
    type: String,
    enum: ['Order Received', 'In Kitchen', 'Sent to Delivery', 'Delivered', 'Cancelled'],
    default: 'Order Received',
  },
  statusUpdatedAt: { type: Date, default: Date.now },

}, { timestamps: true });

module.exports = mongoose.model('Order', orderSchema);