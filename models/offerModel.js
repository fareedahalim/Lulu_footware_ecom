// models/Offer.js
const mongoose = require('mongoose');

const offerSchema = new mongoose.Schema({
    offerType: {
        type: String, 
        required: true
    },
    entityId: {
        type: mongoose.Schema.Types.ObjectId, 
        required: true,
        refPath: 'onModel' 
    },
    onModel: {
        type: String,
        required: true,
        enum: ['Product', 'Brand', 'Occasion'] 
    },
    discountPercentage: {
        type: Number,
        required: true
    },
    validFrom: {
        type: Date,
        required: true
    },
    validTo: {
        type: Date,
        required: true
    },
    status: {
        type: Boolean, 
        default: true
    }
});

module.exports = mongoose.model('Offer', offerSchema);
