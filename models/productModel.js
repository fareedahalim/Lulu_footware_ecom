const mongoose=require("mongoose");

const productSchema=new mongoose.Schema({

    productName:{
        type:String,
        required:true
   },
   description:{
    
    type:String,
    required:true
   },
   brand:{
    type:mongoose.Schema.Types.ObjectId,
    ref:'Brand',
    required:true
   },
   category:{
    type: mongoose.Schema.Types.ObjectId,
        ref: 'Occasion',
        required:true
    
   },
   gender: {
    type: String,
    enum: ["Men", "Women", "Unisex"],
    required: true
},
//    regularPrice:{
//     type:Number,
//     require:true
//     },
//    salesPrice:{
//     type:Number,
//     require:true
//    },
//    productOffer:{
//     type:Number,
//     default:true
//    },
//    quantity:{
//     type:Number,
//     defalt:true
//    },
//    stock:{
//     type:Number,
//     required: true,
//     min: 0, 
// },
//    colour:{
//     type:String,
//     required:true
//    },
//    productImage:{
//     type:[String],
//     required:true
//    },
   isBlocked:{
    type:Boolean,
    default:false
   },
   createdAt: {
    type: Date,
    default: Date.now
},
   status:{
    type:String,
    enum:["Available","Out of stock","Discountinued"],
    required:true,
    default:"Available"
   },
   
},{timestamps:true});

module.exports=mongoose.model("Product",productSchema)