const InventoryItem = require('../models/InventoryItem');

// @route  GET /api/builder/options
// Public — returns in-stock options grouped by category, for the pizza builder steps
const getBuilderOptions = async (req, res, next) => {
  try {
    const items = await InventoryItem.find({ quantity: { $gt: 0 } }).select(
      'category name unitPrice quantity'
    );

    const grouped = {
      base: [],
      sauce: [],
      cheese: [],
      vegetable: [],
    };

    items.forEach((item) => {
      grouped[item.category].push({
        id: item._id,
        name: item.name,
        price: item.unitPrice,
      });
    });

    res.status(200).json({ success: true, options: grouped });
  } catch (error) {
    next(error);
  }
};

module.exports = { getBuilderOptions };