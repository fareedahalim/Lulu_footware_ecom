const mongoose = require('mongoose');

// Define the coupon schema
const couponSchema = new mongoose.Schema({

    
    couponCode: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        uppercase: true // Ensures that coupon code is stored in uppercase
    },
    discountValue: {
        type: Number,
        required: true,
        validate: {
            validator: function(value) {
                return value > 0 && value <= 50; // Limits discount to a maximum of 50%
            },
            message: 'Discount value must be between 1 and 50 percent'
        }
    },
    expiryDate: {
        type: Date,
        required: true,
        validate: {
            validator: function(value) {
                return value > Date.now(); // Ensures that expiry date is in the future
            },
            message: 'Expiry date must be a future date'
        },
        index: { expireAfterSeconds: 0 }
    },
    minPurchase: {
        type: Number,
        default: 0, // Minimum purchase amount for the coupon to be valid
    },
    maxPurchase: {
        type: Number,
        default: 0, // Max discount amount in case of percentage-based coupons
    },
    isActive: {
        type: Boolean,
        default: true // Indicates if the coupon is active or not
    },
    usedBy:[{
        type:mongoose.Schema.Types.ObjectId,
        ref:'User'
    }]
}, { timestamps: true });



// Create and export the model
module.exports = mongoose.model('Coupon', couponSchema);
