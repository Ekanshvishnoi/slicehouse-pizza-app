const mongoose = require('mongoose');

const pizzaItemSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  description: { type: String, trim: true },
  price: { type: Number, required: true, min: 0 },
  image: { type: String }, // URL from Cloudinary/uploaded image
  isActive: { type: Boolean, default: true },
}, { timestamps: true });

module.exports = mongoose.model('PizzaItem', pizzaItemSchema);