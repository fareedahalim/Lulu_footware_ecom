const mongoose = require("mongoose");

const categorySchema = new mongoose.Schema({
    occasion: {
        type: String,
        required: [true, 'Category name is required'],
        unique: true,
        trim: true,
    },
    brand:{
        type:String,
        required:[true,'Brand name is required'],
        unique:true,
        trim:true
    },
    //  status: {
    //     type: Boolean,
    //     default: true
    // }, 
    // blocked: {
    //     type: Boolean,
    //     default: false
    // },
    createdAt: {
        type: Date,
        default: Date.now
    }
 }, { timestamps: true }); 



module.exports = mongoose.model('Category', categorySchema);