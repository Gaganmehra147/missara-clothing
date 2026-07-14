require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const Razorpay = require('razorpay');
const crypto = require('crypto');
const nodemailer = require('nodemailer');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const axios = require('axios');
const mongoose = require('mongoose');
const db = require('./db');
const { Product, Order, Email, User, Review } = require('./models');

const app = express();
const PORT = process.env.PORT || 3000;

let isMongoDBActive = false;

// Connect to MongoDB Atlas (or fallback gracefully to local db.json)
async function connectToMongoDB() {
  const mongoURI = process.env.MONGODB_URI;
  if (!mongoURI || mongoURI.trim() === '') {
    console.log('No MONGODB_URI found in environment variables. Running in local JSON-file fallback mode.');
    return;
  }
  
  try {
    await mongoose.connect(mongoURI, {
      serverSelectionTimeoutMS: 5000
    });
    isMongoDBActive = true;
    console.log('====================================================');
    console.log('Successfully connected to MongoDB Atlas.');
    console.log('====================================================');
    await seedProductsIfEmpty();
  } catch (err) {
    console.error('====================================================');
    console.error('MongoDB Atlas connection failed:', err.message);
    console.error('Falling back to local JSON-file database.');
    console.error('====================================================');
    isMongoDBActive = false;
  }
}

async function seedProductsIfEmpty() {
  try {
    const count = await Product.countDocuments();
    if (count === 0) {
      console.log('Product collection is empty. Seeding default products from db.js...');
      await Product.insertMany(db.DEFAULT_PRODUCTS);
      console.log(`Successfully seeded ${db.DEFAULT_PRODUCTS.length} products to MongoDB.`);
    }
  } catch (err) {
    console.error('Error seeding products to MongoDB:', err.message);
  }
}

connectToMongoDB();

// ==========================================
// NODEMAILER SMTP TRANSPORTER & EMAIL TEMPLATES
// ==========================================

let mailTransporter = null;

function initializeMailTransporter() {
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  
  if (!user || !pass || user.trim() === '' || pass.trim() === '') {
    console.log('====================================================');
    console.log('SMTP credentials not configured. Real email notifications will run in sandbox fallback mode.');
    console.log('====================================================');
    return;
  }
  
  try {
    mailTransporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.SMTP_PORT) || 587,
      secure: process.env.SMTP_PORT === '465',
      auth: {
        user: user,
        pass: pass
      }
    });
    console.log('====================================================');
    console.log('Nodemailer SMTP Transporter configured successfully.');
    console.log('====================================================');
  } catch (err) {
    console.error('Nodemailer initialization failed:', err.message);
  }
}

initializeMailTransporter();

// Helper to send real emails with fallback logs
async function sendRealMail(to, subject, htmlContent) {
  const from = process.env.SMTP_FROM || `Missara Clothing <${process.env.SMTP_USER || 'no-reply@missara.com'}>`;
  
  // Log simulated email to database anyway to sync with client simulator widget
  try {
    const newEmail = {
      id: Date.now(),
      to: to,
      subject: subject,
      body: htmlContent.replace(/<[^>]*>/g, ' ').substring(0, 500) + '...', // plaintext preview
      date: new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" }),
      read: false
    };
    
    if (isMongoDBActive) {
      await new Email(newEmail).save();
    } else {
      const emails = db.getEmails();
      emails.unshift(newEmail);
      db.saveEmails(emails);
    }
  } catch (err) {
    console.error('Failed to log simulated email to DB:', err.message);
  }

  // Send real email if transporter is configured
  if (!mailTransporter) {
    console.log(`[Email Simulator] Real email to ${to} skipped (SMTP not configured).`);
    return;
  }
  
  try {
    await mailTransporter.sendMail({
      from: from,
      to: to,
      subject: subject,
      html: htmlContent
    });
    console.log(`[Email Sent] Real email successfully sent to ${to}: "${subject}"`);
  } catch (err) {
    console.error(`[Email Failed] Failed to send real email to ${to}:`, err.message);
  }
}

// HTML Email Templates Builder Helpers
function getEmailHeader(title) {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <style>
        body { font-family: 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #fcf8f8; color: #4a3e3e; margin: 0; padding: 0; }
        .wrapper { max-width: 600px; margin: 20px auto; background-color: #ffffff; border: 1px solid #f0e6e6; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 10px rgba(0,0,0,0.02); }
        .header { background: linear-gradient(135deg, #fbe3e8, #f5c2c9); padding: 30px; text-align: center; }
        .header h1 { font-family: 'Georgia', serif; font-size: 28px; margin: 0; color: #4a3e3e; letter-spacing: 2px; }
        .header p { font-size: 14px; margin: 5px 0 0; color: #7a6e6e; text-transform: uppercase; letter-spacing: 1px; }
        .content { padding: 30px; line-height: 1.6; }
        .order-card { background-color: #fff9fa; border: 1px solid #fbe3e8; border-radius: 6px; padding: 20px; margin: 20px 0; }
        .table { width: 100%; border-collapse: collapse; margin-top: 15px; }
        .table th { border-bottom: 2px solid #fbe3e8; text-align: left; padding: 8px; font-size: 13px; text-transform: uppercase; color: #7a6e6e; }
        .table td { border-bottom: 1px solid #fbe3e8; padding: 12px 8px; font-size: 14px; }
        .total-row td { font-weight: bold; border-top: 2px solid #fbe3e8; border-bottom: none; color: #4a3e3e; }
        .btn { display: inline-block; background-color: #e5989b; color: #ffffff !important; padding: 12px 25px; text-decoration: none; border-radius: 4px; font-weight: bold; font-size: 14px; margin-top: 15px; text-align: center; }
        .btn:hover { background-color: #b5838d; }
        .footer { background-color: #f7f0f1; padding: 20px; text-align: center; font-size: 12px; color: #9c8e8e; border-top: 1px solid #f0e6e6; }
        .footer a { color: #b5838d; text-decoration: none; }
      </style>
    </head>
    <body>
      <div class="wrapper">
        <div class="header">
          <h1>M I S A A R A</h1>
          <p>${title}</p>
        </div>
        <div class="content">
  `;
}

function getEmailFooter() {
  return `
        </div>
        <div class="footer">
          <p>Thank you for shopping with Missara Clothing!</p>
          <p>If you have any questions, reply to this email or reach us at <a href="mailto:support@missara.com">support@missara.com</a></p>
          <p>&copy; ${new Date().getFullYear()} Missara. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `;
}

function generateOrderConfirmationHTML(order) {
  let itemsHTML = '';
  order.items.forEach(item => {
    itemsHTML += `
      <tr>
        <td>
          <strong>${item.title}</strong><br>
          <span style="font-size: 12px; color: #8c7e7e;">Size: ${item.size} | Qty: ${item.quantity}</span>
        </td>
        <td style="text-align: right; vertical-align: middle;">₹${item.price * item.quantity}</td>
      </tr>
    `;
  });
  
  const domainUrl = process.env.DOMAIN_URL || 'http://localhost:3000';
  
  return `
    ${getEmailHeader('Order Confirmed')}
    <h3>Hello ${order.customer.name},</h3>
    <p>Thank you for placing your order with Missara! We have received your order and our tailors are getting it ready for you.</p>
    
    <div class="order-card">
      <h4 style="margin-top: 0; color: #b5838d;">Order Summary: #${order.orderId}</h4>
      <p style="margin: 5px 0; font-size: 13px;"><strong>Date:</strong> ${order.date}</p>
      <p style="margin: 5px 0; font-size: 13px;"><strong>Payment Method:</strong> ${order.paymentMethod}</p>
      
      <table class="table">
        <thead>
          <tr>
            <th>Item</th>
            <th style="text-align: right;">Amount</th>
          </tr>
        </thead>
        <tbody>
          ${itemsHTML}
          <tr class="total-row">
            <td>Total Amount Paid:</td>
            <td style="text-align: right;">₹${order.total}</td>
          </tr>
        </tbody>
      </table>
    </div>
    
    <p>You can track the status of your order anytime by clicking the button below:</p>
    <a href="${domainUrl}/track.html?orderId=${order.orderId}" class="btn" style="color: #ffffff;">Track Your Order</a>
    
    <h4 style="color: #b5838d; margin-top: 30px;">Shipping Address:</h4>
    <p style="font-size: 14px; line-height: 1.5; color: #5a4e4e;">
      ${order.customer.name}<br>
      ${order.customer.address}, ${order.customer.city}<br>
      ${order.customer.state} - ${order.customer.pincode}<br>
      Phone: ${order.customer.phone}
    </p>
    ${getEmailFooter()}
  `;
}

function generateOrderShippedHTML(order) {
  const domainUrl = process.env.DOMAIN_URL || 'http://localhost:3000';
  return `
    ${getEmailHeader('Order Shipped')}
    <h3>Good news ${order.customer.name}!</h3>
    <p>Your order <strong>#${order.orderId}</strong> has been shipped and is on its way to you.</p>
    
    <div class="order-card">
      <h4 style="margin-top: 0; color: #b5838d;">Courier Details:</h4>
      <p style="margin: 5px 0; font-size: 14px;"><strong>Shipping Partner:</strong> ${order.shippingPartner} (${order.courierPartner})</p>
      <p style="margin: 5px 0; font-size: 14px;"><strong>Tracking ID:</strong> ${order.trackingId}</p>
      <p style="margin: 5px 0; font-size: 14px;"><strong>Estimated Delivery:</strong> ${order.estimatedDelivery}</p>
    </div>
    
    <p>We use high-priority shipping to make sure your clothing reaches you quickly and safely. You can track the shipment journey live:</p>
    <a href="${domainUrl}/track.html?orderId=${order.orderId}" class="btn" style="color: #ffffff;">Track Shipment Status</a>
    ${getEmailFooter()}
  `;
}

function generateOrderDeliveredHTML(order) {
  const domainUrl = process.env.DOMAIN_URL || 'http://localhost:3000';
  return `
    ${getEmailHeader('Order Delivered')}
    <h3>Hello ${order.customer.name},</h3>
    <p>Your order <strong>#${order.orderId}</strong> has been successfully delivered! We hope you love your new outfit.</p>
    
    <div class="order-card" style="text-align: center;">
      <h4 style="margin-top: 0; color: #b5838d;">We'd Love Your Feedback!</h4>
      <p style="font-size: 14px; line-height: 1.5;">Share your style on Instagram and tag us at <strong>@MissaraClothing</strong> to get 10% off your next purchase!</p>
    </div>
    
    <p>If you have any feedback or concerns regarding the size or fit, please don't hesitate to reach out to us.</p>
    <a href="${domainUrl}/shop.html" class="btn" style="color: #ffffff;">Continue Shopping</a>
    ${getEmailFooter()}
  `;
}

// Razorpay will be initialized dynamically per request using database settings

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' })); // support multiple base64 images

// Serve static frontend files from the root
app.use(express.static('.'));

// Helper validation middleware for Admin PIN
function validateAdminPIN(req, res, next) {
  const pin = req.headers['x-admin-pin'];
  const expectedPin = process.env.ADMIN_PIN || '1234';
  if (pin === expectedPin) {
    next();
  } else {
    res.status(401).json({ error: 'Unauthorized: Invalid Admin PIN' });
  }
}

// ==========================================
// AUTHENTICATION API ENDPOINTS
// ==========================================

const JWT_SECRET = process.env.JWT_SECRET || 'missara-super-secret-key-2026';

// Middleware to verify JWT
const verifyToken = (req, res, next) => {
  const token = req.headers['authorization'];
  if (!token) return res.status(403).json({ success: false, message: 'No token provided' });

  jwt.verify(token.split(' ')[1], JWT_SECRET, (err, decoded) => {
    if (err) return res.status(401).json({ success: false, message: 'Unauthorized' });
    req.userId = decoded.id;
    next();
  });
};

app.post('/api/auth/register', async (req, res) => {
  try {
    const { name, email, password, phone } = req.body;
    if (!name || !email || !password) return res.status(400).json({ success: false, message: 'Name, email, and password are required' });

    let existingUser;
    if (isMongoDBActive) {
      existingUser = await User.findOne({ email });
    } else {
      const users = db.getUsers();
      existingUser = users.find(u => u.email === email);
    }

    if (existingUser) return res.status(400).json({ success: false, message: 'Email already registered' });

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = {
      name,
      email,
      password: hashedPassword,
      phone,
      role: 'customer',
      createdAt: new Date()
    };

    let savedUser;
    if (isMongoDBActive) {
      savedUser = await User.create(newUser);
    } else {
      const users = db.getUsers();
      newUser._id = Date.now().toString();
      users.push(newUser);
      db.saveUsers(users);
      savedUser = newUser;
    }

    const token = jwt.sign({ id: savedUser._id || savedUser.id }, JWT_SECRET, { expiresIn: '7d' });
    res.status(201).json({ success: true, token, user: { name: savedUser.name, email: savedUser.email } });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ success: false, message: 'Email and password are required' });

    let user;
    if (isMongoDBActive) {
      user = await User.findOne({ email });
    } else {
      const users = db.getUsers();
      user = users.find(u => u.email === email);
    }

    if (!user) return res.status(401).json({ success: false, message: 'Invalid email or password' });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(401).json({ success: false, message: 'Invalid email or password' });

    const token = jwt.sign({ id: user._id || user.id }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ success: true, token, user: { name: user.name, email: user.email, phone: user.phone } });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

app.get('/api/auth/profile', verifyToken, async (req, res) => {
  try {
    let user;
    if (isMongoDBActive) {
      user = await User.findById(req.userId).select('-password');
    } else {
      const users = db.getUsers();
      user = users.find(u => (u._id || u.id) === req.userId);
      if (user) {
        user = { ...user };
        delete user.password;
      }
    }

    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    res.json({ success: true, user });
  } catch (error) {
    console.error('Profile error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

app.post('/api/auth/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ success: false, message: 'Email is required' });

    let users = db.getUsers();
    let user = null;
    let userIndex = -1;
    
    if (isMongoDBActive) {
      user = await User.findOne({ email });
    } else {
      userIndex = users.findIndex(u => u.email === email);
      if (userIndex !== -1) user = users[userIndex];
    }

    if (!user) {
      // Don't reveal if user exists or not for security, just send success
      return res.json({ success: true, message: 'If that email is registered, we have sent a reset link.' });
    }

    const token = crypto.randomBytes(20).toString('hex');
    const expires = Date.now() + 3600000; // 1 hour from now

    if (isMongoDBActive) {
      user.resetPasswordToken = token;
      user.resetPasswordExpires = expires;
      await user.save();
    } else {
      users[userIndex].resetPasswordToken = token;
      users[userIndex].resetPasswordExpires = expires;
      db.saveUsers(users);
    }

    const resetUrl = `${process.env.DOMAIN_URL || 'http://localhost:3000'}/reset-password.html?token=${token}`;
    const emailHtml = `
      ${getEmailHeader('Reset Your Password')}
      <h3>Hello ${user.name},</h3>
      <p>You requested a password reset for your Missara Clothing account.</p>
      <p>Please click the button below to set a new password. This link is valid for 1 hour.</p>
      <a href="${resetUrl}" class="btn" style="color: white;">Reset Password</a>
      <p style="margin-top: 20px; font-size: 12px; color: #888;">If you did not request this, please ignore this email and your password will remain unchanged.</p>
      ${getEmailFooter()}
    `;

    await sendRealMail(user.email, 'Password Reset Request - Missara Clothing', emailHtml);
    res.json({ success: true, message: 'If that email is registered, we have sent a reset link.' });
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

app.post('/api/auth/reset-password', async (req, res) => {
  try {
    const { token, newPassword } = req.body;
    if (!token || !newPassword) return res.status(400).json({ success: false, message: 'Token and new password are required' });

    let users = db.getUsers();
    let user = null;
    let userIndex = -1;

    if (isMongoDBActive) {
      user = await User.findOne({ resetPasswordToken: token, resetPasswordExpires: { $gt: Date.now() } });
    } else {
      userIndex = users.findIndex(u => u.resetPasswordToken === token && u.resetPasswordExpires > Date.now());
      if (userIndex !== -1) user = users[userIndex];
    }

    if (!user) {
      return res.status(400).json({ success: false, message: 'Password reset token is invalid or has expired.' });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    if (isMongoDBActive) {
      user.password = hashedPassword;
      user.resetPasswordToken = undefined;
      user.resetPasswordExpires = undefined;
      await user.save();
    } else {
      users[userIndex].password = hashedPassword;
      delete users[userIndex].resetPasswordToken;
      delete users[userIndex].resetPasswordExpires;
      db.saveUsers(users);
    }

    res.json({ success: true, message: 'Password has been successfully updated. You can now log in.' });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ==========================================
// PRODUCTS API ENDPOINTS
// ==========================================

// Get all products
app.get('/api/products', async (req, res) => {
  try {
    if (isMongoDBActive) {
      const products = await Product.find().sort({ id: 1 });
      res.json(products);
    } else {
      const products = db.getProducts();
      res.json(products);
    }
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Add new product
app.post('/api/products', validateAdminPIN, async (req, res) => {
  try {
    const newProduct = req.body;
    newProduct.id = newProduct.id || Date.now();
    
    if (isMongoDBActive) {
      const product = new Product(newProduct);
      await product.save();
      res.status(201).json(product);
    } else {
      const products = db.getProducts();
      products.push(newProduct);
      db.saveProducts(products);
      res.status(201).json(newProduct);
    }
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Update existing product
app.put('/api/products/:id', validateAdminPIN, async (req, res) => {
  try {
    const prodId = parseInt(req.params.id);
    const updatedData = req.body;
    
    // Validate id match
    if (updatedData.id !== prodId) {
      updatedData.id = prodId; // enforce correct ID
    }

    if (isMongoDBActive) {
      const product = await Product.findOneAndUpdate(
        { id: prodId },
        updatedData,
        { new: true }
      );
      if (!product) {
        return res.status(404).json({ error: 'Product not found' });
      }
      res.json(product);
    } else {
      const products = db.getProducts();
      const productIndex = products.findIndex(p => p.id === prodId);
      if (productIndex === -1) {
        return res.status(404).json({ error: 'Product not found' });
      }
      
      // Merge keeping the original id
      products[productIndex] = { ...products[productIndex], ...updatedData, id: prodId };
      db.saveProducts(products);
      res.json(products[productIndex]);
    }
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Delete custom product
app.delete('/api/products/:id', validateAdminPIN, async (req, res) => {
  try {
    const prodId = parseInt(req.params.id);
    
    if (isMongoDBActive) {
      const result = await Product.deleteOne({ id: prodId });
      if (result.deletedCount === 0) {
        return res.status(404).json({ error: 'Product not found' });
      }
      res.json({ success: true, message: 'Product deleted successfully.' });
    } else {
      const products = db.getProducts();
      const updatedProducts = products.filter(p => p.id !== prodId);
      db.saveProducts(updatedProducts);
      res.json({ success: true, message: 'Product deleted successfully.' });
    }
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Adjust product stock
app.put('/api/products/:id/stock', async (req, res) => {
  try {
    const prodId = parseInt(req.params.id);
    const { inventory } = req.body;
    const newInventory = Math.max(0, parseInt(inventory) || 0);
    
    if (isMongoDBActive) {
      const product = await Product.findOneAndUpdate(
        { id: prodId },
        { inventory: newInventory },
        { new: true }
      );
      if (!product) {
        return res.status(404).json({ error: 'Product not found' });
      }
      res.json(product);
    } else {
      const products = db.getProducts();
      const product = products.find(p => p.id === prodId);
      if (!product) {
        return res.status(404).json({ error: 'Product not found' });
      }
      product.inventory = newInventory;
      db.saveProducts(products);
      res.json(product);
    }
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ==========================================
// ORDERS API ENDPOINTS
// ==========================================

// Get orders for the logged-in user
app.get('/api/user/orders', verifyToken, async (req, res) => {
  try {
    let userEmail = '';
    
    // Find the user email using req.userId
    if (isMongoDBActive) {
      const user = await User.findById(req.userId);
      if (!user) return res.status(404).json({ success: false, message: 'User not found' });
      userEmail = user.email;
    } else {
      const users = db.getUsers();
      const user = users.find(u => u.id === req.userId || u._id === req.userId);
      if (!user) return res.status(404).json({ success: false, message: 'User not found' });
      userEmail = user.email;
    }

    if (isMongoDBActive) {
      // Find orders matching the user email
      const orders = await Order.find({ 'customer.email': userEmail.toLowerCase() }).sort({ timestamp: -1 });
      res.json(orders);
    } else {
      const orders = db.getOrders();
      const userOrders = orders
        .filter(o => o.customer && o.customer.email && o.customer.email.toLowerCase() === userEmail.toLowerCase())
        .sort((a, b) => b.timestamp - a.timestamp);
      res.json(userOrders);
    }
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ==========================================
// REVIEWS API ENDPOINTS
// ==========================================

// GET all reviews for a product
app.get('/api/reviews/:productId', async (req, res) => {
  try {
    const productId = parseInt(req.params.productId);
    if (isNaN(productId)) return res.status(400).json({ error: 'Invalid product ID' });

    if (isMongoDBActive) {
      const reviews = await Review.find({ productId }).sort({ timestamp: -1 });
      res.json(reviews);
    } else {
      const allReviews = db.getReviews();
      const productReviews = allReviews
        .filter(r => r.productId === productId)
        .sort((a, b) => b.timestamp - a.timestamp);
      res.json(productReviews);
    }
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// POST a new review (user must be logged in)
app.post('/api/reviews', verifyToken, async (req, res) => {
  try {
    const { productId, rating, title, body } = req.body;

    // Validate input
    if (!productId || !rating || !title || !body) {
      return res.status(400).json({ success: false, message: 'All fields are required' });
    }
    if (rating < 1 || rating > 5) {
      return res.status(400).json({ success: false, message: 'Rating must be between 1 and 5' });
    }
    if (title.trim().length < 3 || body.trim().length < 10) {
      return res.status(400).json({ success: false, message: 'Title must be at least 3 chars and review at least 10 chars' });
    }

    // Get user info
    let userName = 'Customer';
    let userId = req.userId;
    if (isMongoDBActive) {
      const user = await User.findById(req.userId);
      if (!user) return res.status(404).json({ success: false, message: 'User not found' });
      userName = user.name;
    } else {
      const users = db.getUsers();
      const user = users.find(u => u.id === req.userId || u._id === req.userId);
      if (!user) return res.status(404).json({ success: false, message: 'User not found' });
      userName = user.name;
    }

    // Check if user has already reviewed this product
    const productIdNum = parseInt(productId);
    if (isMongoDBActive) {
      const existing = await Review.findOne({ productId: productIdNum, userId: String(req.userId) });
      if (existing) return res.status(400).json({ success: false, message: 'You have already reviewed this product' });
    } else {
      const existing = db.getReviews().find(r => r.productId === productIdNum && r.userId === String(req.userId));
      if (existing) return res.status(400).json({ success: false, message: 'You have already reviewed this product' });
    }

    const newReview = {
      productId: productIdNum,
      userId: String(req.userId),
      userName,
      rating: parseInt(rating),
      title: title.trim(),
      body: body.trim(),
      date: new Date().toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' }),
      timestamp: Date.now(),
      helpful: 0
    };

    if (isMongoDBActive) {
      const saved = await Review.create(newReview);
      res.status(201).json({ success: true, review: saved });
    } else {
      const reviews = db.getReviews();
      newReview._id = Date.now().toString();
      reviews.push(newReview);
      db.saveReviews(reviews);
      res.status(201).json({ success: true, review: newReview });
    }
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// DELETE a review (admin only)
app.delete('/api/reviews/:reviewId', validateAdminPIN, async (req, res) => {
  try {
    const reviewId = req.params.reviewId;
    if (isMongoDBActive) {
      await Review.findByIdAndDelete(reviewId);
    } else {
      const reviews = db.getReviews();
      const filtered = reviews.filter(r => r._id !== reviewId);
      db.saveReviews(filtered);
    }
    res.json({ success: true, message: 'Review deleted' });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// GET review summary (avg rating + count) for a product
app.get('/api/reviews/:productId/summary', async (req, res) => {
  try {
    const productId = parseInt(req.params.productId);
    let reviews = [];
    if (isMongoDBActive) {
      reviews = await Review.find({ productId });
    } else {
      reviews = db.getReviews().filter(r => r.productId === productId);
    }
    const count = reviews.length;
    const avg = count === 0 ? 0 : (reviews.reduce((sum, r) => sum + r.rating, 0) / count);
    const dist = [5, 4, 3, 2, 1].map(star => ({
      star,
      count: reviews.filter(r => r.rating === star).length
    }));
    res.json({ count, avg: Math.round(avg * 10) / 10, distribution: dist });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// GET all orders (Admin only)
app.get('/api/orders', validateAdminPIN, async (req, res) => {
  try {
    if (isMongoDBActive) {
      const orders = await Order.find().sort({ timestamp: -1 });
      res.json(orders);
    } else {
      const orders = db.getOrders();
      res.json(orders);
    }
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Get a single order (For tracking)
app.get('/api/orders/:id', async (req, res) => {
  try {
    if (isMongoDBActive) {
      const order = await Order.findOne({ orderId: req.params.id });
      if (order) {
        res.json(order);
      } else {
        res.status(404).json({ error: 'Order not found' });
      }
    } else {
      const orders = db.getOrders();
      const order = orders.find(o => o.orderId === req.params.id);
      if (order) {
        res.json(order);
      } else {
        res.status(404).json({ error: 'Order not found' });
      }
    }
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Place a new order
app.post('/api/orders', async (req, res) => {
  try {
    const newOrder = req.body;
    newOrder.timestamp = Date.now();
    newOrder.date = new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" });
    newOrder.status = "Pending";
    
    if (isMongoDBActive) {
      // Deduct inventory levels
      for (const item of newOrder.items) {
        const product = await Product.findOne({ id: parseInt(item.id) });
        if (product) {
          product.inventory = Math.max(0, (product.inventory !== undefined ? product.inventory : 10) - parseInt(item.quantity));
          await product.save();
        }
      }
      
      const order = new Order(newOrder);
      await order.save();
      
      // Send real email notification (runs in background)
      sendRealMail(newOrder.customer.email, `Order Confirmation - Missara #${newOrder.orderId}`, generateOrderConfirmationHTML(newOrder));
      
      res.status(201).json(order);
    } else {
      // Deduct inventory levels
      const products = db.getProducts();
      newOrder.items.forEach(item => {
        const product = products.find(p => p.id === parseInt(item.id));
        if (product) {
          product.inventory = Math.max(0, (product.inventory !== undefined ? product.inventory : 10) - parseInt(item.quantity));
        }
      });
      
      // Save updated products and orders
      db.saveProducts(products);
      const orders = db.getOrders();
      orders.unshift(newOrder);
      db.saveOrders(orders);
      
      // Send real email notification (runs in background)
      sendRealMail(newOrder.customer.email, `Order Confirmation - Missara #${newOrder.orderId}`, generateOrderConfirmationHTML(newOrder));
      
      res.status(201).json(newOrder);
    }
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Update order status (Admin only)
app.put('/api/orders/:id/status', validateAdminPIN, async (req, res) => {
  try {
    const { status, courierPartner, trackingId, estimatedDelivery, shippedDate, packageWeight } = req.body;
    
    if (isMongoDBActive) {
      const order = await Order.findOne({ orderId: req.params.id });
      if (!order) {
        return res.status(404).json({ error: 'Order not found' });
      }
      
      order.status = status;
      if (status === 'Shipped') {
        order.courierPartner = courierPartner;
        order.trackingId = trackingId;
        order.estimatedDelivery = estimatedDelivery;
        order.shippedDate = shippedDate || new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" });
        order.packageWeight = packageWeight || "0.5";
        order.shippingPartner = "NimbusPost";
      } else if (status === 'Pending') {
        order.courierPartner = undefined;
        order.trackingId = undefined;
        order.shippedDate = undefined;
        order.estimatedDelivery = undefined;
        order.packageWeight = undefined;
        order.shippingPartner = undefined;
      }
      
      await order.save();
      
      // Send real email updates (runs in background)
      if (status === 'Shipped') {
        sendRealMail(order.customer.email, `Your Missara Order #${order.orderId} has been Shipped!`, generateOrderShippedHTML(order));
      } else if (status === 'Delivered') {
        sendRealMail(order.customer.email, `Delivered: Your Missara Order #${order.orderId}`, generateOrderDeliveredHTML(order));
      }
      
      res.json(order);
    } else {
      const orders = db.getOrders();
      const order = orders.find(o => o.orderId === req.params.id);
      
      if (!order) {
        return res.status(404).json({ error: 'Order not found' });
      }
      
      order.status = status;
      if (status === 'Shipped') {
        order.courierPartner = courierPartner;
        order.trackingId = trackingId;
        order.estimatedDelivery = estimatedDelivery;
        order.shippedDate = shippedDate || new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" });
        order.packageWeight = packageWeight || "0.5";
        order.shippingPartner = "NimbusPost";
      } else if (status === 'Pending') {
        delete order.courierPartner;
        delete order.trackingId;
        delete order.shippedDate;
        delete order.estimatedDelivery;
        delete order.packageWeight;
        delete order.shippingPartner;
      }
      
      db.saveOrders(orders);
      
      // Send real email updates (runs in background)
      if (status === 'Shipped') {
        sendRealMail(order.customer.email, `Your Missara Order #${order.orderId} has been Shipped!`, generateOrderShippedHTML(order));
      } else if (status === 'Delivered') {
        sendRealMail(order.customer.email, `Delivered: Your Missara Order #${order.orderId}`, generateOrderDeliveredHTML(order));
      }
      
      res.json(order);
    }
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ==========================================
// SETTINGS API ENDPOINTS
// ==========================================

// Get payment settings
app.get('/api/settings/payment', (req, res) => {
  try {
    const settings = db.getSettings();
    res.json(settings);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Update payment settings (requires admin pin)
app.post('/api/settings/payment', validateAdminPIN, (req, res) => {
  try {
    const newSettings = req.body;
    const settings = db.saveSettings(newSettings);
    res.json({ success: true, settings });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ==========================================
// RAZORPAY PAYMENT API ENDPOINTS
// ==========================================

// Create a secure Razorpay Order
app.post('/api/pay/create-order', async (req, res) => {
  try {
    const { amount, orderId } = req.body;
    const settings = db.getSettings();
    const keyId = settings.keyId || process.env.RAZORPAY_KEY_ID;
    const keySecret = settings.keySecret || process.env.RAZORPAY_KEY_SECRET;
    
    if (keySecret && keySecret.trim() !== "") {
      const options = {
        amount: Math.round(amount * 100),
        currency: "INR",
        receipt: orderId
      };
      
      const razorpay = new Razorpay({
        key_id: keyId,
        key_secret: keySecret
      });
      
      const order = await razorpay.orders.create(options);
      res.json({
        sandbox: false,
        keyId: keyId,
        id: order.id,
        amount: order.amount,
        currency: order.currency
      });
    } else {
      res.json({
        sandbox: true,
        keyId: keyId || 'rzp_test_MissaraDemoKey123',
        id: `order_mock_${Math.floor(100000000000 + Math.random() * 900000000000)}`,
        amount: Math.round(amount * 100),
        currency: "INR"
      });
    }
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Verify payment signature
app.post('/api/pay/verify', (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;
    const settings = db.getSettings();
    const keySecret = settings.keySecret || process.env.RAZORPAY_KEY_SECRET;
    
    if (keySecret && keySecret.trim() !== "") {
      const text = razorpay_order_id + "|" + razorpay_payment_id;
      const generated_signature = crypto
        .createHmac('sha256', keySecret)
        .update(text)
        .digest('hex');
        
      if (generated_signature === razorpay_signature) {
        res.json({ verified: true, paymentId: razorpay_payment_id });
      } else {
        res.status(400).json({ verified: false, error: 'Payment signature verification failed.' });
      }
    } else {
      console.log("Mock signature verified for payment: ", razorpay_payment_id);
      res.json({ verified: true, paymentId: razorpay_payment_id || `pay_mock_${Date.now()}` });
    }
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ==========================================
// CUSTOMER TRANSACTIONAL EMAIL SIMULATOR API
// ==========================================

// Add sent email to database logs
app.post('/api/emails', async (req, res) => {
  try {
    const newEmail = req.body;
    newEmail.id = Date.now();
    newEmail.date = new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" });
    newEmail.read = false;
    
    if (isMongoDBActive) {
      const email = new Email(newEmail);
      await email.save();
      res.status(201).json(email);
    } else {
      const emails = db.getEmails();
      emails.unshift(newEmail);
      db.saveEmails(emails);
      res.status(201).json(newEmail);
    }
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Get emails for a specific customer email address
app.get('/api/emails/customer/:email', async (req, res) => {
  try {
    const customerEmail = req.params.email.toLowerCase().trim();
    
    if (isMongoDBActive) {
      let emails;
      if (customerEmail === 'all') {
        emails = await Email.find().sort({ id: -1 });
      } else {
        emails = await Email.find({ to: { $regex: new RegExp("^" + customerEmail + "$", "i") } }).sort({ id: -1 });
      }
      res.json(emails);
    } else {
      const emails = db.getEmails();
      if (customerEmail === 'all') {
        return res.json(emails);
      }
      const customerEmails = emails.filter(e => e.to.toLowerCase().trim() === customerEmail);
      res.json(customerEmails);
    }
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Get all email logs (Admin view)
app.get('/api/emails', validateAdminPIN, async (req, res) => {
  try {
    if (isMongoDBActive) {
      const emails = await Email.find().sort({ id: -1 });
      res.json(emails);
    } else {
      const emails = db.getEmails();
      res.json(emails);
    }
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Mark email as read
app.put('/api/emails/:id/read', async (req, res) => {
  try {
    const emailId = parseInt(req.params.id);
    
    if (isMongoDBActive) {
      const email = await Email.findOneAndUpdate({ id: emailId }, { read: true }, { new: true });
      if (email) {
        res.json(email);
      } else {
        res.status(404).json({ error: 'Email not found' });
      }
    } else {
      const emails = db.getEmails();
      const email = emails.find(e => e.id === emailId);
      if (email) {
        email.read = true;
        db.saveEmails(emails);
        res.json(email);
      } else {
        res.status(404).json({ error: 'Email not found' });
      }
    }
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ==========================================
// NIMBUSPOST LIVE LOGISTICS INTEGRATION
// ==========================================
let nimbusPostToken = null;

async function getNimbusPostToken() {
  if (nimbusPostToken) return nimbusPostToken;
  try {
    const res = await axios.post('https://api.nimbuspost.com/v1/users/login', {
      email: process.env.NIMBUSPOST_EMAIL,
      password: process.env.NIMBUSPOST_PASSWORD
    });
    if (res.data && res.data.status) {
      nimbusPostToken = res.data.data; // token string
      return nimbusPostToken;
    }
    return null;
  } catch (error) {
    console.error("Failed to authenticate with NimbusPost:", error.message);
    return null;
  }
}

app.post('/api/shipping/serviceability', async (req, res) => {
  try {
    const token = await getNimbusPostToken();
    if (!token) return res.status(500).json({ error: 'NimbusPost Authentication Failed' });

    const { origin, destination, weight, payment_type, order_amount } = req.body;
    
    const response = await axios.post('https://api.nimbuspost.com/v1/courier/serviceability', {
      origin, destination, weight, payment_type, order_amount
    }, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    res.json(response.data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/shipping/create-order', validateAdminPIN, async (req, res) => {
  try {
    const token = await getNimbusPostToken();
    if (!token) return res.status(500).json({ error: 'NimbusPost Auth Failed' });

    const orderPayload = req.body; // Needs exact NimbusPost payload
    
    const response = await axios.post('https://api.nimbuspost.com/v1/shipments', orderPayload, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    if (response.data && response.data.status) {
      res.json({ success: true, awb: response.data.data.awb_number, data: response.data.data });
    } else {
      res.status(400).json({ error: 'Failed to create order on NimbusPost', details: response.data });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// INTELLIGENT AI CHATBOT (GEMINI API)
// ==========================================
app.post('/api/chat', async (req, res) => {
  try {
    const { message } = req.body;
    if (!message || message.trim() === '') {
      return res.status(400).json({ error: 'Message is required' });
    }

    const geminiKey = process.env.GEMINI_API_KEY;
    if (!geminiKey || geminiKey.trim() === '') {
      return res.status(500).json({ error: 'Gemini API Key is not configured on the server' });
    }

    // Call Gemini API using axios
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiKey}`;
    const payload = {
      contents: [
        {
          role: "user",
          parts: [
            {
              text: `SYSTEM INSTRUCTIONS: You are 'Missara AI Personal Stylist', a helpful, premium, and friendly virtual assistant for 'Missara Clothing', a high-end Indian ladies ethnic wear boutique located in Jabalpur, India. You recommend suit sets, kurtas, sarees, and lehengas. Keep replies brief (under 3-4 sentences), luxury-oriented, and extremely helpful.
              
              AVAILABLE PRODUCTS CATALOG:
              - ID: 1, Title: "Pastel Pink Anarkali Suit Set", Category: "Kurtas & Suits", Price: ₹1899, Original: ₹3799
              - ID: 2, Title: "Pink Floral Printed Silk Saree", Category: "Sarees", Price: ₹3299, Original: ₹6599
              - ID: 3, Title: "Premium Cotton Embroidered Kurta Set", Category: "Kurtas & Suits", Price: ₹1599, Original: ₹3199
              - ID: 4, Title: "Pastel Pink & Gold Lehenga Choli", Category: "Lehengas", Price: ₹8999, Original: ₹17999
              - ID: 5, Title: "Floral Pink Ethnic Fusion Dress", Category: "Fusion Wear", Price: ₹1499, Original: ₹2999
              - ID: 6, Title: "Blush Pink Cotton Tunic", Category: "Fusion Wear", Price: ₹899, Original: ₹1799
              - ID: 7, Title: "Deep Pink Embroidered Velvet Suit", Category: "Kurtas & Suits", Price: ₹4299, Original: ₹8599

              RECOMMENDATION RULE:
              If the user asks for products, recommendations, shows interest in buying, or if relevant, recommend 1 to 3 products from the list above. At the very end of your response, you MUST append the recommended product IDs in the exact format: [RECOMMENDED_PRODUCTS: ID1, ID2, ...]. For example, if you recommend Pastel Pink Anarkali Suit Set and Premium Cotton Embroidered Kurta Set, end your reply with: [RECOMMENDED_PRODUCTS: 1, 3]. Do NOT add this bracket if no products are specifically recommended.

              IMPORTANT RULES FOR PRODUCT RECOMMENDATIONS:
              - If a user asks for sarees or shows interest in sarees (e.g. 'saree chahiye', 'show me sarees', 'saree collection', 'sadi'), you MUST include a clean HTML link to the sarees section in your reply: <a href="shop.html?category=Sarees" class="chat-catalog-link" style="color: #DB2255; font-weight: 700; text-decoration: underline; display: block; margin-top: 8px;">Explore Missara Saree Collection 🌸</a>
              - If a user asks for kurtas, suits, or kurtis (e.g. 'kurta', 'suits', 'kurti chahiye', 'kurti'), you MUST include a link to the kurtas section: <a href="shop.html?category=Kurtas%20%26%20Suits" class="chat-catalog-link" style="color: #DB2255; font-weight: 700; text-decoration: underline; display: block; margin-top: 8px;">Explore Missara Kurta & Suit Collection 👗</a>
              - If a user asks for lehengas, include: <a href="shop.html?category=Lehengas" class="chat-catalog-link" style="color: #DB2255; font-weight: 700; text-decoration: underline; display: block; margin-top: 8px;">Explore Missara Lehenga Collection 👑</a>
              - If a user asks for fusion wear, include: <a href="shop.html?category=Fusion%20Wear" class="chat-catalog-link" style="color: #DB2255; font-weight: 700; text-decoration: underline; display: block; margin-top: 8px;">Explore Missara Fusion Wear Collection ✨</a>
              - If they ask general shopping questions, include a link to the main shop page: <a href="shop.html" class="chat-catalog-link" style="color: #DB2255; font-weight: 700; text-decoration: underline; display: block; margin-top: 8px;">Shop All Missara Collections 🛍️</a>

              Style guidelines: Write in a warm mix of Hindi and English (Hinglish) as preferred by Indian online shoppers. Always render HTML links cleanly so they can click them.`
            },
            {
              text: `USER QUERY: ${message}`
            }
          ]
        }
      ]
    };

    const response = await axios.post(url, payload, {
      headers: { 'Content-Type': 'application/json' }
    });

    if (
      response.data &&
      response.data.candidates &&
      response.data.candidates[0] &&
      response.data.candidates[0].content &&
      response.data.candidates[0].content.parts &&
      response.data.candidates[0].content.parts[0]
    ) {
      let reply = response.data.candidates[0].content.parts[0].text;
      
      // Parse recommended product IDs if present
      let recommendedProductIds = [];
      const match = reply.match(/\[RECOMMENDED_PRODUCTS:\s*([\d\s,]+)\]/);
      if (match) {
        recommendedProductIds = match[1]
          .split(',')
          .map(idStr => parseInt(idStr.trim(), 10))
          .filter(id => !isNaN(id));
        
        // Remove the bracketed tag from the reply text
        reply = reply.replace(/\[RECOMMENDED_PRODUCTS:\s*[\d\s,]+\]/, '').trim();
      }

      // Fetch products details
      let productsList = [];
      if (recommendedProductIds.length > 0) {
        try {
          if (isMongoDBActive) {
            productsList = await Product.find({ id: { $in: recommendedProductIds } });
          } else {
            const allProds = db.getProducts();
            productsList = allProds.filter(p => recommendedProductIds.includes(p.id));
          }
        } catch (dbErr) {
          console.error('Error fetching chatbot products:', dbErr.message);
        }
      }

      res.json({ reply, products: productsList });
    } else {
      console.error('Unexpected Gemini Response format:', response.data);
      res.status(500).json({ error: 'Failed to process AI response format' });
    }
  } catch (err) {
    console.error('Gemini API Error:', err.message);
    res.status(500).json({ error: 'Server error while talking to Gemini AI' });
  }
});


// ==========================================
// START SERVER
// ==========================================
app.listen(PORT, () => {

  console.log(`====================================================`);
  console.log(`Missara Clothing Store Server running on port ${PORT}`);
  console.log(`Open in browser: http://localhost:${PORT}`);
  console.log(`====================================================`);
});
