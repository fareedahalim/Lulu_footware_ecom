const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema({
    username: { type: String, required: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }, // Reference to User
    varientId: { type: mongoose.Schema.Types.ObjectId, ref: 'Varient', required: true }, // Reference to Variant
    comment: { type: String, required: true },
    rating: { type: Number, min: 1, max: 5, required: true },
    createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('Review', reviewSchema);