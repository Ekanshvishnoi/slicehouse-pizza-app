const express = require('express');
const router = express.Router();

const {
  registerUser,
  verifyEmail,
  loginUser,
  forgotPassword,
  resetPassword,
  refreshAccessToken,
  loginAdmin,
  getMe,
  logout,
} = require('../controllers/authController');

const { protect } = require('../middleware/authMiddleware');

router.post('/register', registerUser);
router.get('/verify-email/:token', verifyEmail);
router.post('/login', loginUser);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password/:token', resetPassword);
router.post('/refresh', refreshAccessToken);
router.post('/admin/login', loginAdmin);
router.get('/me', protect, getMe);
router.post('/logout', logout);

module.exports = router;