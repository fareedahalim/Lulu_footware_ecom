const mongoose = require("mongoose");
const bcrypt = require('bcrypt');

const userSchema = new mongoose.Schema({
    username: {
        type: String,
        required: true,
        unique: true
    },
    email: {  
        type: String,
        required: true,
        unique: true
    },
    mobile: {  
        type: String,
        required: false,
        unique: true,
        sparse:true,
        default:null
    },
    googleId:{
      type:String,
      unique:true,
      sparse:true
    },
    password: {
        type: String,
        required: false
    },
    isBlocked:{
    type:Boolean,
    default:false
    },
    isAdmin:{
        type:Boolean,
        default:false
    },
    createdAt: {
        type: Date,
        default: Date.now
      },
    cart: [
        {
          product: {
             type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
          //quantity: Number,
        }
      ],
      wallet:[
        {
            type:mongoose.Schema.Types.ObjectId,
            ref:"Wishlist"
        }
      ],
      wishlist:[
        { 
           product: { 
            type: mongoose.Schema.Types.ObjectId,
             ref: 'Product'
             },
      
        }
      
      ],
      referalCode:{
        type:String
      },
      redeemed:{
        type:Boolean
      },
      redeemUsers:[
        {
            type:mongoose.Schema.Types.ObjectId,
            ref:"User"
        }
      ]
      // ,
//     otp:{

//     type: String
// },
//     otpExpires: Date
});

// Middleware to hash password before saving
userSchema.pre('save', async function(next) {
    if (this.isModified('password')) {
        // Hash password
        this.password = await bcrypt.hash(this.password, 12);
        // Ensure confirmPassword is also hashed
        this.confirmPassword = this.password;
    }
    next();
});

// Method to validate password
userSchema.methods.isValidPassword = async function(password) {
    return await bcrypt.compare(password, this.password);
};

module.exports = mongoose.model('User', userSchema);  // Corrected module.exports
