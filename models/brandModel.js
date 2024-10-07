const mongoose = require("mongoose");

const brandSchema = new mongoose.Schema({
    brandName: {
        type: String,
        required: [true, 'brand  name is required'],
        unique: true,
        trim: true,
    },
    
    status: {
        type: Boolean,
        default: true
    },
    blocked: {
        type: Boolean,
        default: false
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
}, { timestamps: true });

module.exports = mongoose.model('Brand', brandSchema);
