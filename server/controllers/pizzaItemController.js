const PizzaItem = require('../models/PizzaItem');

// @route  GET /api/pizza-items
// Public — used by the user dashboard to show active pizzas
const getActivePizzaItems = async (req, res, next) => {
  try {
    const items = await PizzaItem.find({ isActive: true });
    res.status(200).json({ success: true, items });
  } catch (error) {
    next(error);
  }
};

// @route  GET /api/pizza-items/admin
// Admin — returns ALL items, active and hidden
const getAllPizzaItems = async (req, res, next) => {
  try {
    const items = await PizzaItem.find();
    res.status(200).json({ success: true, items });
  } catch (error) {
    next(error);
  }
};

// @route  POST /api/pizza-items
// Admin — create a new pizza item
const createPizzaItem = async (req, res, next) => {
  try {
    const { name, description, price } = req.body;

    if (!name || !price) {
      return res.status(400).json({ success: false, message: 'Name and price are required' });
    }

    const image = req.file ? req.file.path : undefined;

    const item = await PizzaItem.create({ name, description, price, image });

    res.status(201).json({ success: true, item });
  } catch (error) {
    next(error);
  }
};

// @route  PUT /api/pizza-items/:id
// Admin — update an existing item (including toggling isActive)
const updatePizzaItem = async (req, res, next) => {
  try {
    const { name, description, price, isActive } = req.body;

    const updateData = { name, description, price, isActive };
    if (req.file) {
      updateData.image = req.file.path;
    }

    const item = await PizzaItem.findByIdAndUpdate(req.params.id, updateData, {
      new: true,
      runValidators: true,
    });

    if (!item) {
      return res.status(404).json({ success: false, message: 'Pizza item not found' });
    }

    res.status(200).json({ success: true, item });
  } catch (error) {
    next(error);
  }
};

// @route  DELETE /api/pizza-items/:id
// Admin — permanently delete an item
const deletePizzaItem = async (req, res, next) => {
  try {
    const item = await PizzaItem.findByIdAndDelete(req.params.id);

    if (!item) {
      return res.status(404).json({ success: false, message: 'Pizza item not found' });
    }

    res.status(200).json({ success: true, message: 'Pizza item deleted' });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getActivePizzaItems,
  getAllPizzaItems,
  createPizzaItem,
  updatePizzaItem,
  deletePizzaItem,
};