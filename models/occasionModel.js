const mongoose = require("mongoose");

const occasionSchema = new mongoose.Schema({
    categoryName: {
        type: String,
        required: [true, 'Occasion  name is required'],
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

module.exports = mongoose.model('Occasion', occasionSchema);
