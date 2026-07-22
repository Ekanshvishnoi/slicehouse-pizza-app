const InventoryItem = require('../models/InventoryItem');

// @route  GET /api/inventory
// Admin — full inventory list, optionally filtered by category
const getInventory = async (req, res, next) => {
  try {
    const { category } = req.query;
    const filter = category ? { category } : {};

    const items = await InventoryItem.find(filter).sort({ category: 1, name: 1 });

    res.status(200).json({ success: true, items });
  } catch (error) {
    next(error);
  }
};

// @route  GET /api/inventory/summary
// Admin — the 4 category cards (total quantity + lowest threshold status per category)
const getInventorySummary = async (req, res, next) => {
  try {
    const items = await InventoryItem.find();

    const categories = ['base', 'sauce', 'cheese', 'vegetable'];
    const summary = categories.map((category) => {
      const categoryItems = items.filter((item) => item.category === category);
      const totalQuantity = categoryItems.reduce((sum, item) => sum + item.quantity, 0);
      const hasLowStock = categoryItems.some((item) => item.quantity < item.threshold);

      return { category, totalQuantity, hasLowStock, itemCount: categoryItems.length };
    });

    res.status(200).json({ success: true, summary });
  } catch (error) {
    next(error);
  }
};

// @route  POST /api/inventory
// Admin — add a new inventory item
const createInventoryItem = async (req, res, next) => {
  try {
    const { category, name, quantity, threshold, unitPrice } = req.body;

    if (!category || !name || threshold === undefined || unitPrice === undefined) {
      return res.status(400).json({ success: false, message: 'Missing required fields' });
    }

    const item = await InventoryItem.create({ category, name, quantity, threshold, unitPrice });

    res.status(201).json({ success: true, item });
  } catch (error) {
    next(error);
  }
};

// @route  PUT /api/inventory/:id
// Admin — manual stock update (also used to edit threshold/price)
const updateInventoryItem = async (req, res, next) => {
  try {
    const { quantity, threshold, unitPrice, name } = req.body;

    const item = await InventoryItem.findByIdAndUpdate(
      req.params.id,
      { quantity, threshold, unitPrice, name },
      { new: true, runValidators: true }
    );

    if (!item) {
      return res.status(404).json({ success: false, message: 'Inventory item not found' });
    }

    res.status(200).json({ success: true, item });
  } catch (error) {
    next(error);
  }
};

// @route  DELETE /api/inventory/:id
const deleteInventoryItem = async (req, res, next) => {
  try {
    const item = await InventoryItem.findByIdAndDelete(req.params.id);

    if (!item) {
      return res.status(404).json({ success: false, message: 'Inventory item not found' });
    }

    res.status(200).json({ success: true, message: 'Inventory item deleted' });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getInventory,
  getInventorySummary,
  createInventoryItem,
  updateInventoryItem,
  deleteInventoryItem,
};