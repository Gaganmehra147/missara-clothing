const mongoose = require('mongoose');

// ==========================================
// PRODUCT SCHEMA
// ==========================================
const productSchema = new mongoose.Schema({
  id: { type: Number, required: true, unique: true },
  title: { type: String, required: true },
  category: { type: String, required: true },
  price: { type: Number, required: true },
  originalPrice: { type: Number, required: true },
  rating: { type: Number, default: 4.8 },
  reviewsCount: { type: Number, default: 1 },
  inventory: { type: Number, default: 10 },
  image: { type: String, required: true },
  hoverImage: { type: String },
  images: [{ type: String }],
  description: { type: String },
  sizes: [{ type: String }],
  colors: [{ type: String }],
  tag: { type: String, default: null },
  fabric: { type: String, default: "" },
  occasion: { type: String, default: "" },
  pattern: { type: String, default: "" },
  style: { type: String, default: "" },
  sleeveLength: { type: String, default: "" },
  neck: { type: String, default: "" },
  details: {
    fabric: { type: String, default: '100% Cotton' },
    length: { type: String, default: 'N/A' },
    neck: { type: String, default: 'N/A' },
    washCare: { type: String, default: 'Hand wash cold separately' }
  }
});

// ==========================================
// ORDER SCHEMA
// ==========================================
const orderSchema = new mongoose.Schema({
  orderId: { type: String, required: true, unique: true },
  date: { type: String, required: true },
  timestamp: { type: Number, required: true },
  customer: {
    name: { type: String, required: true },
    email: { type: String, required: true },
    phone: { type: String, required: true },
    address: { type: String, required: true },
    city: { type: String, required: true },
    state: { type: String, required: true },
    pincode: { type: String, required: true }
  },
  items: [{
    id: { type: Number, required: true },
    title: { type: String, required: true },
    price: { type: Number, required: true },
    image: { type: String, required: true },
    size: { type: String, required: true },
    quantity: { type: Number, required: true },
    category: { type: String }
  }],
  subtotal: { type: Number, required: true },
  discount: { type: Number, default: 0 },
  shippingCharge: { type: Number, default: 0 },
  codCharge: { type: Number, default: 0 },
  total: { type: Number, required: true },
  paymentMethod: { type: String, required: true },
  status: { type: String, default: 'Pending', enum: ['Pending', 'Shipped', 'Delivered'] },
  courierPartner: { type: String },
  trackingId: { type: String },
  estimatedDelivery: { type: String },
  shippedDate: { type: String },
  packageWeight: { type: String },
  shippingPartner: { type: String },
  deliveryZone: { type: String, default: 'C' }
});

// ==========================================
// EMAIL LOG SCHEMA
// ==========================================
const emailSchema = new mongoose.Schema({
  id: { type: Number, required: true, unique: true },
  to: { type: String, required: true },
  subject: { type: String, required: true },
  body: { type: String, required: true },
  date: { type: String, required: true },
  read: { type: Boolean, default: false }
});

// ==========================================
// USER SCHEMA
// ==========================================
const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  phone: { type: String },
  addresses: [{
    address: String,
    city: String,
    state: String,
    pincode: String,
    isDefault: Boolean
  }],
  role: { type: String, default: 'customer' },
  resetPasswordToken: { type: String },
  resetPasswordExpires: { type: Date },
  createdAt: { type: Date, default: Date.now }
});

// ==========================================
// REVIEW SCHEMA
// ==========================================
const reviewSchema = new mongoose.Schema({
  productId: { type: Number, required: true, index: true },
  userId: { type: String, required: true },
  userName: { type: String, required: true },
  rating: { type: Number, required: true, min: 1, max: 5 },
  title: { type: String, required: true },
  body: { type: String, required: true },
  date: { type: String, required: true },
  timestamp: { type: Number, required: true },
  helpful: { type: Number, default: 0 }
});

const Product = mongoose.model('Product', productSchema);
const Order = mongoose.model('Order', orderSchema);
const Email = mongoose.model('Email', emailSchema);
const User = mongoose.model('User', userSchema);
const Review = mongoose.model('Review', reviewSchema);

module.exports = {
  Product,
  Order,
  Email,
  User,
  Review
};
