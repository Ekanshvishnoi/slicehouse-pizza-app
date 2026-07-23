require('dotenv').config();
const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const connectDB = require('./config/db');
const authRoutes = require('./routes/authRoutes');
const pizzaItemRoutes = require('./routes/pizzaItemRoutes');
const inventoryRoutes = require('./routes/inventoryRoutes');
const builderRoutes = require('./routes/builderRoutes');
const orderRoutes = require('./routes/orderRoutes');
const paymentRoutes = require('./routes/paymentRoutes');
const cron = require('node-cron');
const checkLowStock = require('./utils/checkLowStock');
const notFound = require('./middleware/notFound');
const errorHandler = require('./middleware/errorHandler');

// Connect to MongoDB
connectDB();

// Runs every 6 hours: 00:00, 06:00, 12:00, 18:00
cron.schedule('0 */6 * * *', () => {
  console.log('[Cron] Running scheduled low-stock check...');
  checkLowStock();
});

const app = express();

// Request logger
app.use((req, res, next) => {
  console.log(`${req.method} ${req.originalUrl} - ${new Date().toISOString()}`);
  next();
});

// Core middleware
app.use(cors({
  origin: process.env.CLIENT_URL,
  credentials: true,
}));

app.use(cookieParser());

// Webhook route MUST be defined BEFORE express.json(), with its own raw body parser —
// Razorpay's signature verification needs the exact raw bytes, not parsed JSON
const { razorpayWebhook } = require('./controllers/paymentController');
app.post('/api/payments/webhook', express.raw({ type: 'application/json' }), razorpayWebhook);

// Now apply JSON parsing for all other routes
app.use(express.json());

// Routes
app.get('/', (req, res) => {
  res.json({ message: 'SliceHouse API is running' });
});

// (all your future routes — /api/auth, /api/orders, etc. — go here, between routes and the two lines below)
app.use('/api/auth', authRoutes);
app.use('/api/pizza-items', pizzaItemRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/builder', builderRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/payments', paymentRoutes);

// 404 + error handling — must be LAST
app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});