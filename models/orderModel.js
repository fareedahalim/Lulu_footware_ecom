const mongoose = require('mongoose');
const orderSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },

  payment: {
    type: String,
    default: 'COD',
  },
  address: [{
    username: String,
    mobile: Number,
    city: String,
    pincode: Number,
    state: String,
    address: String,
  }],
  status: {
    type: String,
    enum: ['Pending', 'Returned', 'Delivered', 'Cancelled','cancellation','Shipped','Failed','Processing'],
    default: 'Pending',
  },
 

  products: [
    {
      varientId: { type: mongoose.Schema.Types.ObjectId, ref: 'Varient' },  // Reference to variant
      quantity: Number,
      productPrice:Number,
      finalPrice: Number
    }
  ],
  totalAmount: {
    type: Number,
    default: 0,
  },
  
  cancellation: {
    isCancelled: {
      type: Boolean,
      default: false,
    },
    reason: {
      type: String,
      default: '',
    },
    cancelledByAdmin: {
      type: Boolean,
      default: false,
    },
  },
 
  discountAmount: {
    type: Number,
    default: 0,
  },
  orderDate:{
    type: Date,
    default:Date.now
  },
  razorpayOrderId: {
    type: String,  // Add a field to store the Razorpay Order ID
  },
  paymentStatus:{
    type:Boolean,
    default:false,
  },
  paymentId: {
    type: String,  // Razorpay Payment ID, will be populated upon success
  },
  deliveredAt: {
    type: Date,
    // default: Date.now
  },
});


const Order = mongoose.model('Order', orderSchema);

module.exports = Order;