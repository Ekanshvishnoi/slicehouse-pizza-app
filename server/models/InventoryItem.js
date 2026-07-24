const mongoose = require('mongoose');

const inventoryItemSchema = new mongoose.Schema({
  category: {
    type: String,
    required: true,
    enum: ['base', 'sauce', 'cheese', 'vegetable'],
  },
  name: { type: String, required: true, trim: true },
  quantity: { type: Number, required: true, min: 0, default: 0 },
  threshold: { type: Number, required: true, min: 0 },
  unitPrice: { type: Number, required: true, min: 0 },
}, { timestamps: true });

module.exports = mongoose.model('InventoryItem', inventoryItemSchema);