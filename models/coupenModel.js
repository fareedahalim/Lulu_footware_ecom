const mongoose = require('mongoose');


const couponSchema = new mongoose.Schema({

    
    couponCode: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        uppercase: true 
    },
    discountValue: {
        type: Number,
        required: true,
        validate: {
            validator: function(value) {
                return value > 0 && value <= 50; 
            },
            message: 'Discount value must be between 1 and 50 percent'
        }
    },
    expiryDate: {
        type: Date,
        required: true,
        validate: {
            validator: function(value) {
                return value > Date.now(); 
            },
            message: 'Expiry date must be a future date'
        },
        index: { expireAfterSeconds: 0 }
    },
    minPurchase: {
        type: Number,
        default: 0, 
    },
    maxPurchase: {
        type: Number,
        default: 0, 
    },
    isActive: {
        type: Boolean,
        default: true 
    },
    usedBy:[{
        type:mongoose.Schema.Types.ObjectId,
        ref:'User'
    }]
}, { timestamps: true });




module.exports = mongoose.model('Coupon', couponSchema);
