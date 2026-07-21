const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Admin = require('../models/Admin');

// Verifies the access token and attaches the user/admin to req
const protect = async (req, res, next) => {
  let token;

  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.split(' ')[1];
  }

  if (!token) {
    return res.status(401).json({ success: false, message: 'Not authorized, no token' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    if (decoded.role === 'admin') {
      req.admin = await Admin.findById(decoded.id).select('-password');
      if (!req.admin) {
        return res.status(401).json({ success: false, message: 'Admin not found' });
      }
    } else {
      req.user = await User.findById(decoded.id).select('-password');
      if (!req.user) {
        return res.status(401).json({ success: false, message: 'User not found' });
      }
    }

    req.role = decoded.role;
    next();
  } catch (error) {
    return res.status(401).json({ success: false, message: 'Not authorized, token invalid or expired' });
  }
};

// Restricts a route to admins only — used AFTER protect
const isAdmin = (req, res, next) => {
  if (req.role !== 'admin') {
    return res.status(403).json({ success: false, message: 'Admin access only' });
  }
  next();
};

module.exports = { protect, isAdmin };