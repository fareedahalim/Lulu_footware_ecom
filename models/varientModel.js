const mongoose = require("mongoose");

const varientSchema = new mongoose.Schema({
    
    productId:{
        type:mongoose.Schema.Types.ObjectId,
        ref:'Product',
        required:true
    },
    stock:
     { 
        type: Number, 
        
    },
    color:
     { 
        type: String, 
        // required: true 
    },
    price:
     { 
        type: Number, 
        // required: true 
    },
    size:
     { 
        type: Number,
        //  required: true
    },
    createdAt:
     {
         type: Date,
        default: Date.now
     },
     status: {
        type: Boolean,
        default: true
    },
    
    images: [String]
    
})

module.exports=mongoose.model("Varient",varientSchema)