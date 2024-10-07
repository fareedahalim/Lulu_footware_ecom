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
        
    },
    price:
     { 
        type: Number, 
    
    },
    size:
     { 
        type: Number,
        
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