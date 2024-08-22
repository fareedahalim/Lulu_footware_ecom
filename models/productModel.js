const mongoose=require("mongoose");

const productSchema=new mongoose.model({

    productName:{
        type:String,
        required:true
   },
   description:{
    
    type:String,
    required:true
   },
   brand:{
    type:String,
    required:true
   },
   category:{
    type: mongoose.Schema.Types.ObjectId,
        ref: 'Category'
    
   },
   regularPrice:{
    type:Number,
    require:true
    },
   salesPrice:{
    type:Number,
    require:true
   },
   productOffer:{
    type:Number,
    default:true
   },
   quantity:{
    type:Number,
    defalt:true
   },
   stock:{
    type:Number,
    required: true,
    min: 0, 
},
   colour:{
    type:String,
    required:true
   },
   productImage:{
    type:[String],
    required:true
   },
   isBlocked:{
    type:Boolean,
    default:false
   },
   status:{
    type:String,
    enum:["Available","Out of stock","Discountinued"],
    required:true,
    default:"Available"
   },
},{timestamps:true});

module.exports=mongoose.model("Product",productSchema)