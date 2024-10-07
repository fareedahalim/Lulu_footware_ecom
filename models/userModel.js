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
          varient: {
             type: mongoose.Schema.Types.ObjectId, ref: 'Varient' },
            quantity: Number,
        }
      ],
      wallet:
        {
          type: Number,
          default: 0,
        },
        walletTransactions: [
          {
              type: { type: String, enum: ['credit', 'debit'], required: true },  
              amount: { type: Number, required: true },
              description: { type: String },  
              date: { type: Date, default: Date.now }
          }
      ],
      
      wishlist:[
        { 
          varient: { 
            type: mongoose.Schema.Types.ObjectId,
             ref: 'Varient'
             },
      
        }
      
      ],
      referalCode:{
        type:String
      },
      
      redeemUsers:[
        {
            type:mongoose.Schema.Types.ObjectId,
            ref:"User"
        }
      ],
      usedCoupons: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Coupon'
    }],
     reviews: [{ 
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Review'
  }]
 
});


userSchema.pre('save', async function(next) {
    if (this.isModified('password')) {
        
        this.password = await bcrypt.hash(this.password, 12);
        
        this.confirmPassword = this.password;
    }
    next();
});

userSchema.methods.isValidPassword = async function(password) {
    return await bcrypt.compare(password, this.password);
};

module.exports = mongoose.model('User', userSchema);  
