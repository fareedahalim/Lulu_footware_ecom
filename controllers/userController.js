const User = require("../models/userModel");
const bcrypt = require("bcrypt")
const Occasion = require('../models/occasionModel');
const Brand = require('../models/brandModel');
const Product = require('../models/productModel'); 
const Varient = require('../models/varientModel');
const Offer = require('../models/offerModel');
const Address=require("../models/addressModel");
const Order =require("../models/orderModel");
const otpGenerator = require('otp-generator');
const nodemailer = require('nodemailer');
const Coupon=require('../models/coupenModel')
const Review=require('../models/reviewModel')
const { ProfilingLevel, ObjectId } = require("mongodb");
require("dotenv").config();
const Razorpay = require('razorpay');
const crypto = require('crypto');
const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');



const razorpayInstance = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID, 
    key_secret: process.env.RAZORPAY_KEY_SECRET,
});



const pageNotFound = async (req, res) => {
    try {

        res.render("page-404")
    } catch (error) {
        res.redirect("/pageNotFound")
    }
}




const loadHomepage = async (req, res) => {
    try {
        
        const user = req.session.user;

        if (user) {
            const userDetails = await User.findById({ _id: user });
            if (userDetails.isBlocked === true) {
                req.session.destroy((err) => {
                    if (err) {
                        console.log("Session destruction error", err.message);
                        return res.redirect("/pageNotFound");
                    }
                    return res.redirect("/login");
                });
            }
        }

        let userData = null;
        if (user) {
            
            userData = await User.findOne({ _id: user });
        }

        
        const products = await Product.find({ isBlocked: false })
        .populate({ 
            path: 'brand', 
            match: { blocked: false } // Only populate brands that are not blocked
        })
        .populate({ 
            path: 'category', 
            match: { blocked: false } // Only populate categories that are not blocked
        });

    // Filter out products with blocked brands or categories
    const filteredProducts = products.filter(product => {
        return product.brand !== null && product.category !== null;
    });

        

        
        const productsWithVariants = await Promise.all(filteredProducts.map(async product => {
            const variants = await Varient.find({ productId: product._id });

            
            const variantsWithFinalPrice = await Promise.all(variants.map(async (variant) => {
                let finalPrice = variant.price;
                let productDiscount = 0;
                let brandDiscount = 0;

            
                const productOffer = await Offer.findOne({
                    entityId: variant.productId
                });

                if (productOffer) {
                    productDiscount = (productOffer.discountPercentage / 100) * variant.price;
                }

            
                const brandOffer = await Offer.findOne({
                    entityId: product.brand._id
                });

                if (brandOffer) {
                    brandDiscount = (brandOffer.discountPercentage / 100) * variant.price;
                }

                
                const maxDiscount = Math.max(productDiscount, brandDiscount);
                finalPrice = variant.price - maxDiscount;

            
                return {
                    ...variant.toObject(),
                    finalPrice
                };
            }));

        
            return {
                ...product.toObject(),
                variants: variantsWithFinalPrice
            };
        }));

        
        return res.render('users/home', { user: userData, products: productsWithVariants });

    } catch (error) {
        console.log('Error loading home page:', error.message);
        res.status(500).send('Internal Server Error');
    }
};

// 
const loadShoppingPage = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 7;
        const skip = (page - 1) * limit;

        const searchInput = req.query.search ? req.query.search.trim() : '';

        const filter = { isBlocked: false }; // Only fetch unblocked products
        if (req.query.category) filter.category = req.query.category;
        if (req.query.brand) filter.brand = req.query.brand;

        const priceFilter = {};
        if (req.query.minPrice && req.query.maxPrice) {
            priceFilter['variants.price'] = {
                $gte: parseFloat(req.query.minPrice),
                $lte: parseFloat(req.query.maxPrice),
            };
        }

        let variantFilter = {};
        if (req.query.color) {
            variantFilter.color = req.query.color;
        }

        const user = req.session.user;
        const userData = user ? await User.findById(user) : null;

        // Fetch products that are not blocked and populate brands and categories
        const products = await Product.find(filter)
            .populate({ path: 'brand', match: { blocked: false } }) // Only populate unblocked brands
            .populate({ path: 'category', match: { blocked: false } }) // Only populate unblocked categories
            .skip(skip)
            .limit(limit);

        // Filter out products with blocked brands or categories
        const filteredProducts = products.filter(product => product.brand && product.category);

        // Fetch variants that are not blocked and apply price filtering
        const variants = await Varient.find({
            ...variantFilter,
            ...priceFilter,
        });

        const uniqueProductsMap = new Map();

        for (const product of filteredProducts) {
            const productVariants = variants.filter(variant => variant.productId.equals(product._id));
            if (productVariants.length > 0) {
                for (const variant of productVariants) {
                    let finalPrice = variant.price;
                    let productDiscount = 0;
                    let brandDiscount = 0;

                    const productOffer = await Offer.findOne({ entityId: product._id });
                    if (productOffer) {
                        productDiscount = (productOffer.discountPercentage / 100) * variant.price;
                    }

                    const brandOffer = await Offer.findOne({ entityId: product.brand._id });
                    if (brandOffer) {
                        brandDiscount = (brandOffer.discountPercentage / 100) * variant.price;
                    }

                    const maxDiscount = Math.max(productDiscount, brandDiscount);
                    finalPrice = variant.price - maxDiscount;
                    variant.finalPrice = finalPrice; 
                }

                uniqueProductsMap.set(product._id.toString(), {
                    ...product.toObject(),
                    variants: productVariants
                });
            }
        }

        const occasionData = await Occasion.find({ blocked: false }); // Only fetch unblocked occasions
        const brandData = await Brand.find({ blocked: false }); // Only fetch unblocked brands

        const uniqueColors = [...new Set(variants.map(variant => variant.color))];

        const productsCount = await Product.countDocuments(filter);

        return res.render('users/shop', {
            user: userData,
            products: Array.from(uniqueProductsMap.values()),
            occasionData,
            brandData,
            uniqueColors,
            currentPage: page,
            totalPages: Math.ceil(productsCount / limit),
            searchInput,
        });

    } catch (error) {
        console.error('Error loading shop page:', error.message);
        return res.status(500).send('Internal Server Error');
    }
};



const loadProductDetails = async (req, res) => {
    try {
        const user = req.session.user;
        let userData = null;

       
        const varientId = req.params.varientId;
        
        
        if (user) {
            userData = await User.findById(user);
            if (!userData) {
                return res.status(404).send('User not found');
            }
        }
            
        const varientAll=await Varient.find();
        
        const varient = await Varient.findById(varientId);
       
        if (!varient) {
            return res.status(404).send('Variant not found');
        }

        const product = await Product.findById(varient.productId).populate('brand category');
        if (!product) {
            return res.status(404).send('Product not found');
        }
        
        const reviews = await Review.find({ varientId }).populate('userId');

        let finalPrice = varient.price;
        let productDiscount = 0;
        let brandDiscount = 0;

        
        const productOffer = await Offer.findOne({
            entityId: varient.productId 
            
        });

        if (productOffer) {
            productDiscount = (productOffer.discountPercentage / 100) * varient.price;
            
        }

      
        const brandOffer = await Offer.findOne({
            entityId: product.brand._id  
            
        });

        if (brandOffer) {
            brandDiscount = (brandOffer.discountPercentage / 100) * varient.price;
            
        }

       
        const maxDiscount = Math.max(productDiscount, brandDiscount);
        finalPrice = varient.price - maxDiscount;
    

        return res.render('users/singleProduct', { user: userData, product, varient, finalPrice,varientAll,reviews });

    } catch (error) {
        console.log('Error loading product details:', error);
        res.status(500).send('Internal Server Error');
    }
};


const loadSignUp = async (req, res) => {
    try {

        res.render('users/signUp')
        
    } catch (error) {
        console.log(error.message)
    }
}
function generateNumericOtp(length) {
    let otp = '';
    for (let i = 0; i < length; i++) {
        otp += Math.floor(Math.random() * 10);  
    }
    return otp;
}


function generateReferralCode() {
    return crypto.randomBytes(3).toString('hex'); 
  }

  const continueSignup = async (req, res) => {
    try {
        const { username, email, mobile, password, confirmPassword ,referralCode} = req.body;
        
        
        if (password !== confirmPassword) {
            return res.render("users/signUp", { message: "Passwords do not match" });
        }

    
        const existingUser = await User.findOne({ email });

        
        if (existingUser && existingUser.isBlocked) {
            return res.render("users/signUp", { message: "Your account is blocked, you cannot sign up." });
        }

        
        if (existingUser) {
            return res.render("users/signUp", { message: "User already exists" });
        }


        const mobileExists = await User.findOne({ mobile });
        if (mobileExists) {
            return res.render("users/signUp", { message: "Mobile number already exists. Please check and try again." });
        }
         
        
        const generatedOtp = generateNumericOtp(6);

        
        const transporter = nodemailer.createTransport({
            service: 'Gmail',
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASS,
            },
        });

        const mailOptions = {
            from: process.env.EMAIL_USER,
            to: email,
            subject: 'OTP Verification',
            text: `Your OTP for Lulu Footwear signup is ${generatedOtp}`,
        };

        transporter.sendMail(mailOptions, (error, info) => {
            if (error) {
                console.log(error);
                return res.render("users/signUp", { message: "Failed to send OTP email. Please try again." });
            }
            
        });

       
        req.session.userOtp = generatedOtp;
        req.session.userData = { username, email, mobile, password,referralCode };
        req.session.otpExpireTime = Date.now() + 5 * 60 * 1000; 

        
        console.log("OTP sent:", generatedOtp);
        res.render("users/otp", { user: email, otpSent: true });
    } catch (error) {
        console.error("Error during signup:", error);
        res.status(500).send('Internal server error');
    }
};

const resendOtp=async(req,res)=>{
    try{
    const generatedOtp = generateNumericOtp(6);
    const email=req.session.userData.email
    
    req.session.userOtp = generatedOtp;
    req.session.otpExpireTime = Date.now() + 1 * 60 * 1000;
        
        const transporter = nodemailer.createTransport({
            service: 'Gmail',
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASS,
            },
        });

        const mailOptions = {
            from: process.env.EMAIL_USER,
            to: email,
            subject: 'OTP Verification',
            text: `Your OTP for Lulu Footwear signup is ${generatedOtp}`,
        };

        transporter.sendMail(mailOptions, (error, info) => {
            if (error) {
                console.log(error);
                return res.render("users/signUp", { message: "Failed to send OTP email. Please try again." });
            }
            
        });

        
       
        
        
        
        res.render("users/otp", { user: email, otpSent: true });
    } catch (error) {
        console.error("Error during signup:", error);
        res.status(500).send('Internal server error');
    }
}


const verifyOtp = async (req, res) => {
    
    const { otp} = req.body;
    const referralCode = req.session.userData.referralCode; 
    
  
    if (otp === req.session.userOtp) {
        
        const user = req.session.userData;
        let referralOwner = null;
        if(referralCode){
            
            referralOwner = await User.findOne({ referalCode: referralCode });
            
        }
      const ReferelCode= generateReferralCode();
        const saveUserData = new User({
            username: user.username,
            email: user.email,
            mobile: user.mobile,
            password: user.password,
            referalCode:ReferelCode,
            wallet:0
        });

        if (referralOwner) {
            saveUserData.wallet+=200
            
            referralOwner.wallet += 500;
            
            await referralOwner.save();
        }
    
        await saveUserData.save();

        req.session.user = saveUserData._id;
        return res.json({ success: true, redirect: "/login" });
    } else {
        return res.json({ success: false, errorMessage: "Invalid OTP, please try again." });
    }
};

const loadLogin = async (req, res) => {
    try {
        if(!req.session.user)
        {
        
        res.render('users/login', { message: req.session.message });
        req.session.message = null;
        }  
        else{
        res.redirect("/")
        }      
    } catch (error) {
        res.redirect("users/pageNot Found")
    }
}
const login = async (req, res) => {
    try {

        const { email, password } = req.body;
        if (!email || !password) {
            return res.render("users/login", { message: "Email and password are required" });
        }
        
        const findUser = await User.findOne({ email })
        if (!findUser) {
            return res.render("users/login", { errorMessage: "User is not found" })
        }
        if (findUser.isBlocked) {
            return res.render("users/login", { errorMessage: "User is blocked by admin" })
        }

        const passwordMatch = await bcrypt.compare(password, findUser.password);

        if (!passwordMatch) {
            return res.render("users/login", { errorMessage: "Incorrect email or password" });
        }
        req.session.user = findUser._id;
        
    
        res.redirect("/home")
    } catch (error) {

        
        res.render("users/login", { errorMessage: "Login failed.Please try again later" })
    }
}

const logout=async(req,res)=>{
    try {
        req.session.destroy((err)=>{
            if(err){
                console.log("Session destruction error",err.message)
                return res.redirect("/pageNotFound");
            }
            return res.redirect("/login")
        })
    } catch (error) {
        console.log("Logout error",error)
        res.redirect('/pageNOtFound')
    }
}

// 
const loadForgotPassword = (req, res) => {

    res.render('users/forgotPassword', { message: req.session.message });
    req.session.message = null;
};

const verifyResetOtp = async (req, res) => {
    try {
        
        const { otp } = req.body;
    
        if (otp === req.session.userOtp) { 
            const user = req.session.user;
            return res.json({ success: true, redirect: "/reset-password" });
        } else {
            return res.json({ success: false, errorMessage: "Invalid OTP, please try again." });
        }
        
    } catch (error) {
        console.error("Error verifying OTP:", error);
        res.status(500).send("Server error");
    }
};

const resetResendOtp = async (req, res) => {
    try {
        const generatedOtp = generateNumericOtp(6);
        const email = req.session.resetEmail;  // Use the email stored in the session during forgot password

        if (!email) {
            return res.render("users/forgotPassword", { message: "Email not found in session. Please try again." });
        }

        req.session.userOtp = generatedOtp;
        req.session.otpExpireTime = Date.now() + 5 * 60 * 1000;  // OTP expiry time

        // Send OTP email logic
        const transporter = nodemailer.createTransport({
            service: 'Gmail',
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASS,
            },
        });

        const mailOptions = {
            from: process.env.EMAIL_USER,
            to: email,
            subject: 'OTP Verification',
            text: `Your OTP for Lulu Footwear password reset is ${generatedOtp}`,
        };

       
    
        
        res.render("users/resetOtp", { otpSent: true });
    } catch (error) {
        console.error("Error resending OTP:", error);

       
        res.render("users/forgotPassword", { message: "Failed to resend OTP email. Please try again." });
    }
};


const handleForgotPassword = async (req, res) => {
    try {
        
        const { email } = req.body;
        const user = await User.findOne({ email });

        if (!user) {
            req.session.message = "Email not found";
            return res.redirect('/forgot-password');
        }

        
        const generatedOtp = generateNumericOtp(6);
        

        const transporter = nodemailer.createTransport({
            service: 'Gmail',
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASS,
            },
        });

        const mailOptions = {
            from: process.env.EMAIL_USER,
            to: email,
            subject: 'OTP Verification',
            text: `Your OTP for Lulu Footwear password reset is ${generatedOtp}`,
        };

        transporter.sendMail(mailOptions, (error, info) => {
            if (error) {
                console.log(error);
                return res.render("users/forgotPassword", { message: "Failed to send OTP email. Please try again." });
            }
            
        });

    
        req.session.userOtp = generatedOtp;
        req.session.resetEmail = email;
        
        
        res.render("users/resetOtp", {  otpSent: true });
    } catch (error) {
        console.error("Error during forgot password:", error);
        res.status(500).send("Server error");
    }
};



const loadResetPassword = (req, res) => {
    if (!req.session.userOtp) {
        req.session.message = "Unauthorized access. Please request a password reset and verify OTP.";
        return res.redirect('/forgot-password');
    }
    res.render('users/resetPassword');
};


const handleResetPassword = async (req, res) => {
    try {
        const { password, confirmPassword } = req.body;

        if (password !== confirmPassword) {
            return res.render('users/resetPassword', { errorMessage: "Passwords do not match" });
        }

        const user = await User.findOne({ email: req.session.resetEmail });

        if (!user) {
            req.session.message = "No user found with that email. Please try again.";
            return res.redirect('/forgot-password');
        }
          user.password=password
        
        await user.save();

        
        req.session.resetEmail = null;
        req.session.message = "Password reset successful. You can now log in.";
        res.redirect('/login');
    } catch (error) {
        console.error("Error during password reset:", error);
        res.status(500).send("Server error");
    }
};

//User Profile------------------------------

const viewProfile=async(req,res)=>{
    try {
        
        
       const user=await User.findById(req.session.user);
       if(!user){
        return res.redirect('/login')
       }
       res.render("users/profile",{user}); 
    } catch (error) {
        console.error(error.message);
        res.status(500).send("Internal Server Error");
    }
}

const loadEditProfile = async (req, res) => {
    try{
    const userId=req.params.id;
    
    const user=await User.findById(userId);
    
    res.render('users/edit-profile',{user});
    }
    catch(error){
        console.error('Error loading edit category page:', error.message);
        res.status(500).send('Internal Server Error');
    }
    
};


const editProfile = async (req, res) => {
    try {
        const userId = req.params.id; 

        
        const { username,mobile } = req.body;

    
        if (!username || !mobile) {
            return res.status(400).json({ message: 'All fields are required' });
        }

        
        const user = await User.findByIdAndUpdate(
            userId,
            { username,mobile },
            { new: true, runValidators: true } 
        );

        
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        
        res.status(200).json({ message: 'Profile updated successfully', user });
    } catch (error) {
        console.error('Error updating profile:', error);

        
        res.status(500).json({ message: 'Server error' });
    }
};

const loadchangepassword = async (req, res) => {
    try {
      if (req.session.user) {
        
        res.render('users/changePassword', { user: req.session.user });
      } else {
        res.redirect('/login');
      }
    } catch (error) {
      console.error("Error loading change password page:", error.message);
      res.status(500).send("Internal Server Error");
    }
  };
  
const changepassword=async(req,res)=>{
    
    const {oldPassword,newPassword,confirmPassword}=req.body;
    
    
    
    const userId=req.session.user;
    

    try {
        if(newPassword!==confirmPassword){
            return res.render('users/changePassword',{message:"Password do not match"})
        }
      const user=await User.findById(userId);
      if(!user){
        return res.status(404).send("User not found")
      } 
      const isPasswordMatch=await bcrypt.compare(oldPassword,user.password);
      
      if(!isPasswordMatch){
      return  res.render("users/changePassword",{message:"Incorrect old password"})
      }
      
      user.password=newPassword;

      await user.save();
      return res.render("users/login", { message: "Password updated successfully" });

    } catch (error) {
        console.log(error.message)
         return res.render('users/profile', { message: "An error occurred. Please try again later." });
    }
}
const validatePassword = async(req,res)=>{
    const { oldPassword } = req.body;
    const userId = req.session.user;

    try {
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ valid: false, message: 'User not found' });
        }

        const isPasswordMatch = await bcrypt.compare(oldPassword, user.password);
        if (!isPasswordMatch) {
            return res.json({ valid: false });
        }

        return res.json({ valid: true });
    } catch (error) {
        console.error('Error validating password:', error);
        return res.status(500).json({ valid: false });
    }

}

///user Cart
const loadCartList = async (req, res) => {
    try {
        
        if(req.session.address){
            
            req.session.address=null;
        
           }
        const userId = req.session.user;
        let finalPrice
        const user = await User.findById(userId)
            .populate({
                path: 'cart.varient',
                populate: {
                    path: 'productId'
                }
            });
            
        if (!user) {
        
            return res.redirect('/login');
        }
       
        for (let cartItem of user.cart) {
            const varient = cartItem.varient;
            if(varient.productId.isBlocked==true||varient.stock<=0){
            
                user.cart = [];
                await user.save();
            }
            finalPrice = varient.price;
            let productDiscount = 0;
            let brandDiscount = 0;

            const productOffer = await Offer.findOne({ entityId: varient.productId._id });
            const brandOffer = await Offer.findOne({ entityId: varient.productId.brand });

            if (productOffer) {
                productDiscount = (productOffer.discountPercentage / 100) * varient.price;
            }
            if (brandOffer) {
                brandDiscount = (brandOffer.discountPercentage / 100) * varient.price;
            }

            const maxDiscount = Math.max(productDiscount, brandDiscount);
            cartItem.finalPrice = varient.price - maxDiscount;  
        }

        const cartCount = user.cart.length;

        
        res.render('users/cart', { user, cartCount ,finalPrice});
    } catch (error) {
        console.log('Error:', error);
        return res.status(500).send("Internal Server Error");
    }
};

const addtoCart = async (req, res) => {
    try {
        const varientId = req.params.varientId;
        const userId = req.session.user;

        if (!userId) {
            return res.redirect("/login");
        }

        const user = await User.findById(userId);
        const varient = await Varient.findById(varientId);
        
        if (!varient || varient.stock <= 0) {
            return res.redirect("/cartList")
        }

        const product = await Product.findById(varient.productId);

        if (!product) {
            return res.status(404).send("Product not found");
        }

        if (user && user.cart) {
            const existingCartItem = user.cart.find(cartItem => cartItem.varient.toString() === varientId);

            if (existingCartItem) {
                if (existingCartItem.quantity < varient.stock) {
                    existingCartItem.quantity += 1;
                } else {
                    return res.redirect("/cartList")
                }
            } else {
                user.cart.push({
                    varient: varientId,
                    quantity: 1,
                });
            }
        } else {
            user.cart = [
                {
                    varient: varientId,
                    quantity: 1,
                },
            ];
        }

        await user.save();
        return res.redirect("/cartList");
    } catch (error) {
        console.log(error.message);
        return res.status(500).send("Internal Server Error");
    }
};



 const  deleteCart= async (req, res) => {
    try {
        
        const userId = req.session.user;
        
        const varientId = req.params.varientId;

        
        const user = await User.findById(userId);
        

        if (!user) {
            return res.status(404).send('User not found');
        }

        
        user.cart = user.cart.filter(item => item.varient._id.toString() !== varientId);

        
        await user.save();

        res.redirect('/cartList'); 
    } catch (error) {
        console.error('Error removing item from cart:', error);
        res.status(500).send('Internal Server Error');
    }
};

const updateCartQuantity=async(req,res)=>{

    const user=req.params.session;
    const varientId = req.params.productId;
    
    
    const newQuantity = req.body.quantity;
    try {
      const varient = await Varient.findById(varientId);
      if (!varient) {
        return res.status(404).json({ error: "Product not found" });
      }
  
      if (newQuantity > varient.stock) {
        return res
          .status(400)
          .json({ error: "Requested quantity exceeds available stock" });
      }
  
      await User.findOneAndUpdate({
        user, "cart.varient": varientId },
        { $set: { "cart.$.quantity": newQuantity } },
        { new: true }
      );
      res.status(200).json({ success: "Quantity updated successfully" });
    } catch (error) {
      console.log(error.message);
      res.status(500).json({ error: "Internal server error" });
    }
}

const updateCartTotal = async (req, res) => {
    try {
      const userId = req.params.userId;
  

      const user = await User.findById(userId);
  
      if (!user || !user.cart || user.cart.length === 0) {
        return res.status(404).json({ error: 'Cart not found' });
      }
  
      
      let total = 0;
      for (const item of user.cart) {
        const varient = await Product.findById(item.varient._id); 
        if (varient) {
          total += varient.price * item.quantity;
        }
      }
       
      
      res.json({ total });
    } catch (error) {
      console.error('Error updating cart total:', error);
      res.status(500).json({ error: 'Failed to update cart total' });
    }
  };
  
  const loadCheckout = async (req, res) => {
    try {


        const existing_address_id = req.body;
        const user = req.session.user;
        let addressChecked =0
        
        if (req.session.address){
            addressChecked=1
        }

        
        if (!user) {
            return res.redirect("/login");
        }

        
        const userCart = await User.findById(user)
            .populate({
                path: 'cart.varient',
                populate: {
                    path: 'productId',
                },
            });
        
          if(userCart.cart.length===0){

            return res.redirect("/cartList")
          }
        let sum = 0;
        let finalPrice;

        
        for (let cartItem of userCart.cart) {
            const varient = cartItem.varient;
            
            if(varient.productId.isBlocked==true||varient.stock<=0){
            
                return res.redirect("/shop")
            }
            finalPrice = varient.price;

            let productDiscount = 0;
            let brandDiscount = 0;

        
            const productOffer = await Offer.findOne({ entityId: varient.productId._id });
            if (productOffer) {
                productDiscount = (productOffer.discountPercentage / 100) * varient.price;
            }

            
            const brandOffer = await Offer.findOne({ entityId: varient.productId.brand });
            if (brandOffer) {
                brandDiscount = (brandOffer.discountPercentage / 100) * varient.price;
            }

        
            const maxDiscount = Math.max(productDiscount, brandDiscount);
            cartItem.finalPrice = varient.price - maxDiscount;
          
            
            sum += cartItem.finalPrice*cartItem.quantity
            
            
        }

        

        
        const address = await Address.find({ user: user });

        
        res.render('users/checkout', { address, userCart, sum, addressChecked: addressChecked, finalPrice,user });

    } catch (error) {
        
        console.error("Error in loadCheckout:", error);
        res.status(500).send("An error occurred during the checkout process. Please try again later.");
    }
};

const saveBuildingAddress=async(req,res)=>{
    try {
        
        const {name,mobile,address,city,pincode,district,state}=req.body;
          
        const newAddress=new Address({
            user:req.session.user,
            address:[{
                name,
                mobile,
                address,
                city,
                pincode,
                district,
                state
            }]
        })
        await newAddress.save();
        return res.redirect('/checkout')
    } catch (error) {
        console.log(error.message);
    }
}

const saveAddress=async(req,res)=>{
    
    try {

        if(req.session.address){
            req.session.address=null;
        }
        const addressId = req.body.existing_address_id;
        req.session.address = addressId;
        
        res.redirect('/checkout')
    } catch (error) {
     console.error(error);   
    }
}



const placeOrder = async (req, res) => {
    try {
    
        const user = await User.findById(req.session.user)
            .populate({
                path: 'cart.varient',
                populate: {
                    path: 'productId',
                },
            });

            
        

        const address = await Address.findById(req.session.address);
        if (!address) {
        
            req.flash('error', 'Please select an address before placing the order.');
            return res.redirect('/checkout');
        }
        const coupon=req.session.couponCode;
        if (coupon && coupon._id) {
            await User.findByIdAndUpdate(req.session.user, {
                $push: { usedCoupons: coupon._id }
            });
        }

        let varients = [];
        let subtotal = 0;
        let sum = 0;
        let finalSum = 0;
        const couponDiscount = req.session.coupon;
        
        
        for (let cartItem of user.cart) {
            const varient = cartItem.varient;
             if(varient.productId.isBlocked==true||varient.stock<=0){
            
                return res.redirect("/shop")
            }
            let originalPrice = varient.price;
            let finalPrice = originalPrice;
            let productDiscount = 0;
            let brandDiscount = 0;
            


            const productOffer = await Offer.findOne({ entityId: varient.productId._id });
            if (productOffer) {
                productDiscount = (productOffer.discountPercentage / 100) * originalPrice;
            }

            const brandOffer = await Offer.findOne({ entityId: varient.productId.brand });
            if (brandOffer) {
                brandDiscount = (brandOffer.discountPercentage / 100) * originalPrice;
            }

            const maxDiscount = Math.max(productDiscount, brandDiscount);
            finalPrice = originalPrice - maxDiscount;

            subtotal += originalPrice * cartItem.quantity;
            sum += finalPrice * cartItem.quantity;

            varients.push({
                varientId: varient._id,
                quantity: cartItem.quantity,
                productPrice:originalPrice,
                finalPrice,
            });
        }
        
        let discount=0;
        if (couponDiscount) {
          
           discount=Math.floor(sum*(couponDiscount/100))
           
            finalSum = sum - (sum * (couponDiscount / 100));
            
            
        } else {
            
            finalSum = sum;
        }

        
        const paymentMethod = req.body.payment_method;

        if (paymentMethod === 'Wallet') {

              if (user.wallet < finalSum) {
                req.flash('error', 'Insufficient Wallet Balance');
                return res.redirect('/checkout'); 
            }
        
        
            const newOrder = new Order({
                userId: req.session.user,
                address: [{
                    username: address.address[0].name,
                    mobile: address.address[0].mobile,
                    city: address.address[0].city,
                    state: address.address[0].state,
                    pincode: address.address[0].pincode,
                }],
                products: varients,
                subtotal: subtotal,
                totalAmount: finalSum,
                discountAmount: discount,
                payment: 'Wallet' 
            });
        
            
            await newOrder.save();
        
            
            user.wallet -= finalSum;
        
            user.walletTransactions.push({
                type: 'debit',
                amount: finalSum,
                description: `Payment for order #${newOrder._id}`
            });
        
            
            await user.save();
        
            
            req.session.order = newOrder;
            
        
            return res.redirect('/success-page');
        }
        
        
        if (paymentMethod === 'Razorpay') {
            
        
        
            const razorpayOrder = {
                amount: finalSum * 100, 
                currency: 'INR',
                receipt: `order_${new Date().getTime()}`,
            };
        
            
            const razorpayResponse = await razorpayInstance.orders.create(razorpayOrder);
            

        
            const newOrder = new Order({
                userId: req.session.user,
                address: [{
                    username: address.address[0].name,
                    mobile: address.address[0].mobile,
                    city: address.address[0].city,
                    state: address.address[0].state,
                    pincode: address.address[0].pincode,
                }],
                products: varients,
                subtotal,
                totalAmount: finalSum,
                discountAmount: discount,
                payment: 'Razorpay',
                razorpayOrderId: razorpayResponse.id, 
            });
        
            
            await newOrder.save();
        
    
            req.session.order = newOrder;
        
            
            return res.render('users/razorpay', {
                key_id: process.env.RAZORPAY_KEY_ID,
                orderId: razorpayResponse.id,
                amount: finalSum,
                currency: 'INR',
                user: req.session.user, 
            });
        }
        
        
        const newOrder = new Order({
            userId: req.session.user,
            address: [{
                username: address.address[0].name,
                mobile: address.address[0].mobile,
                city: address.address[0].city,
                state: address.address[0].state,
                pincode: address.address[0].pincode,
            }],
            products: varients,
            subtotal: subtotal,
            totalAmount: finalSum,
            discountAmount:discount
        });

        
        await newOrder.save();
        req.session.order=newOrder;
        
        return res.redirect('/success-page');
       
    } catch (error) {
        console.error("Error placing order:", error);
        res.status(500).send("Internal Server Error");
    }
};
const loadSuccess = async (req, res) => {
    const user=req.session.user;

    try {
        
         
        
        const newOrderData = req.session.order;
        

        if (!newOrderData) {
            return res.render('users/paymentFailed', { message: 'No order data found' });
        }
       
        const order = await Order.findById(newOrderData._id);

        if (!order) {
            return res.render('users/paymentFailed', { message: 'Order not found' });
        }

    
        order.paymentStatus = true;
         

        
        await order.save();  
       

        

        for (const item of newOrderData.products) {
            const varient = await Varient.findById(item.varientId);
            if (varient) {
                varient.stock = Math.max(0, varient.stock - item.quantity);
                await varient.save();
            }
        }

        
        req.session.newOrder = null;
    
        req.session.address = "";

        
        const user = await User.findById(req.session.user);
         
        user.cart = [];
        await user.save();
        
        return res.render('users/successPage', { message: 'Order placed successfully!',user });
       
    } catch (error) {
        console.error("Error saving order after payment:", error);
        return res.status(500).send("Error completing order");
    }
};



//order

const loadorderHistory=async (req,res)=>{
    try {
      const user=req.session.user;
      if(!user){
       return res.redirect('/login')
      }
      
      
     
      const searchQuery=req.query.search||"";
      const page=parseInt(req.query.page)||1
      const limit=5;
      const skip=(page-1)*limit;

      searchCondition=[
        {status:new RegExp(searchQuery ,'i')},
        {'address.username':new RegExp(searchQuery,'i'),}
      ]
      if(ObjectId.isValid(searchQuery)){
        searchCondition.push({_id:searchQuery});
      }
      const orderData=await Order.find({userId:user,
      $or:searchCondition,
    }) 
    .sort({ orderDate: -1 })
    .skip(skip)
    .limit(limit)
    .exec();

    const totalOrders=await Order.countDocuments({
        userId:user,
        $or:searchCondition,
    })
    
    const totalPages=Math.ceil(totalOrders/limit);
      res.render('users/order-history',{orderData,searchQuery,currentPage:page,totalPages,user})
      
    } catch (error) {
        console.error(error)
    }

}

const loadViewProduct = async (req, res) => {
    try {
        const orderId = req.params.orderId;

        
        const order = await Order.findById(orderId)
            .populate({
                path: 'products.varientId',
                populate: { path: 'productId' }
            });
            
        if (!order) {
            return res.status(404).send('Order not found');
        }

        
        res.render('users/view-product', { order });
    } catch (error) {
        console.error("Error fetching order details:", error);
        res.status(500).send("Internal Server Error");
    }
}

//cancel Order

 const statusChange = async (req, res) => {
    try {
        const user = req.session.user;
        const orderId = req.params.orderId;
        const order = await Order.findById(orderId);
        
        if(!user){
         return res.redirect('/login')
        }
        


        if (!order) {
            return res.status(404).json({ message: 'Order not found' });
        }

        if (order.status === 'Cancelled') {
            return res.status(400).json({ message: 'Order is already cancelled' });
        }

    
        order.status = 'Cancelled';

        
        for (const item of order.products) {
            const variant = await Varient.findById(item.varientId); 

            if (variant) {
                variant.stock += item.quantity;
                await variant.save();
            }
        }

        
        const refundAmount = order.totalAmount; 
        const userAccount = await User.findById(user);
        if (!userAccount) {
            return res.status(404).json({ message: 'User not found' });
        }
        if (userAccount.wallet === undefined || userAccount.wallet === null) {
            userAccount.wallet = 0; 
        }
        if (!isNaN(refundAmount) && refundAmount > 0) {
            userAccount.wallet += refundAmount; 
            
            userAccount.walletTransactions.push({
                type: 'credit',
                amount: refundAmount,
                description: `Refund for order #${order._id}`
            });
            await userAccount.save(); 
        }

        await order.save();
        return res.redirect('/order-history');
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};


const returnOrder = async (req, res) => {
    try {
        const user = req.session.user;
        const orderId = req.params.orderId;
        const order = await Order.findById(orderId);
        
        if (!order) {
            return res.status(404).json({ message: 'Order not found' });
        }

        if (order.status !== 'Delivered') {
            return res.status(400).json({ message: 'Order is not eligible for return' });
        }

        
        order.status = 'Returned';

        
        for (const item of order.products) {
            const varient = await Varient.findById(item.varientId);
            if (varient) {
                varient.stock += item.quantity; 
                await varient.save();
            }
        }

        const refundAmount = order.totalAmount; 
        const userAccount = await User.findById(user);
        if (!userAccount) {
               
            return res.status(404).json({ message: 'User not found' });
        }
        if (userAccount.wallet === undefined || userAccount.wallet === null) {
            userAccount.wallet = 0; 
        }
        if (!isNaN(refundAmount) && refundAmount > 0) {
            userAccount.wallet += refundAmount; 

            userAccount.walletTransactions.push({
                type: 'credit',
                amount: refundAmount,
                description: `Refund for order #${order._id}`
            });
            await userAccount.save(); 
        }
        await order.save();

        
        return res.redirect('/order-history');
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

// 
const paymentFailed = async (req, res) => {
    
    const user=req.session.user;

    const orderId = req.session.orderId; 

    if (!orderId) {
        return res.render('users/paymentFailed', { message: 'No order data found in session',user });
    }

    try {
     
        const order = await Order.findOneAndUpdate(
            { _id: orderId }, 
            { status: 'Failed', paymentStatus: false }, 
            { new: true }
        );

        if (!order) {
            return res.status(404).render('users/paymentFailed', { message: 'Order not found',user });
        }

        
        return res.render('users/paymentFailed', { message: 'Payment failed. Please try again.' ,user});
    } catch (error) {
        console.error("Error updating order after payment failed:", error);
        return res.status(500).send("Error updating order status after failed payment");
    }
};





const retryPayment = async (req, res) => {
    const orderId = req.params.orderId;
    const order = await Order.findById(orderId).populate({
        path: 'products.varientId',
        populate: {
            path: 'productId' 
        }
    });
    
    if (!order) {
        return res.status(404).send("Order not found");
    }

    const timeLimitHours = 24; 
    const orderTime = new Date(order.orderDate);
    const currentTime = new Date();
    const hoursSinceOrder = (currentTime - orderTime) / (1000 * 60 * 60); 


    if (hoursSinceOrder > timeLimitHours) {
        req.flash('error', "The payment can't be done this time.");
        return res.redirect("/order-history");
    }

    for (let orderItem of order.products) {
        const varient = orderItem.varientId;

        
        if (varient.productId.isBlocked || varient.price !== orderItem.productPrice) {
            order.status = 'Cancelled';
            await order.save();
            req.flash('error', 'Product is not available');
            return res.redirect("/order-history");
        }
    }

    
    const instance = new Razorpay({
        key_id: process.env.RAZORPAY_KEY_ID,
        key_secret: process.env.RAZORPAY_KEY_SECRET
    });

    const razorpayOrder = await instance.orders.create({
        amount: order.totalAmount * 100,
        currency: 'INR',
        receipt: `receipt_${order._id}`,
        payment_capture: 1,
    });

    res.render('users/retryPayment', {
        key_id: process.env.RAZORPAY_KEY_ID,
        orderId: razorpayOrder.id,
        amount: order.totalAmount,
        user: req.session.user
    });
};


//invoice

const downloadInvoice = async (req, res) => {
    try {
        const orderId = req.params.orderId; 
        const order = await Order.findById(orderId)
            .populate({
                path: 'products.varientId', 
                populate: {
                    path: 'productId', 
                    model: 'Product' 
                }
            }); 

        if (!order) {
            return res.status(404).send('Order not found');
        }

       
        const orderData = {
            address: order.address[0],
            products: order.products,
            subtotal: order.subtotal,
            discountAmount: order.discountAmount,
            totalAmount: order.totalAmount,
        };

       
        const invoicePath = await generateInvoice(orderId, orderData); 

      
        if (!fs.existsSync(invoicePath)) {
            return res.status(404).send('Invoice not found');
        }

       
        res.download(invoicePath, (err) => {
            if (err) {
                console.error("Error downloading invoice:", err);
                res.status(500).send("Error downloading invoice.");
            }
        });
    } catch (error) {
        console.error("Error in downloadInvoice:", error);
        res.status(500).send("An error occurred while downloading the invoice.");
    }
};


const generateInvoice = (orderId, orderData) => {
 return new Promise((resolve, reject) => {
    const invoiceDir = path.join(__dirname, 'invoices');
    const invoicePath = path.join(invoiceDir, `invoice_${orderId}.pdf`);

    if (!fs.existsSync(invoiceDir)) {
        fs.mkdirSync(invoiceDir);
    }

    const doc = new PDFDocument();
    const writeStream = fs.createWriteStream(invoicePath);

    writeStream.on('error', (err) => {
        console.error("Error writing invoice:", err);
    });

    doc.pipe(writeStream);
    
    doc
       .fontSize(20)
       .text('Lulu Footwear', {align: 'left'})
       .moveUp()
       .fontSize(10)
       .text('Lulu Footwear ', 400, 50)   
       .text('Thamarasseri, Kozhikkode, Kerala', 400)
       .text('Email: lulu@gmail.com', 400)
       .text('Phone: +9024175689', 400);


       doc.moveDown(2);
   
    doc.moveTo(50, doc.y)  
   .lineTo(550, doc.y)
   .stroke();

    

doc.moveDown(1)
   .fontSize(15)
   .text('INVOICE', 0, doc.y, { align: 'center', underline: true }) 


doc.moveTo(50, doc.y + 10).lineTo(550, doc.y + 10).stroke(); 

doc.moveDown(2);
doc  
   .fontSize(10)
   .text(`Invoice Date: ${new Date().toDateString()}`, 50) 
   .text(`Customer Name: ${orderData.address.username}`, 50)
   .text(`Contact Number: ${orderData.address.mobile}`, 50)
   .text(`Shipping Address: ${orderData.address.address}, ${orderData.address.city}, ${orderData.address.state}, India, ${orderData.address.pincode}`, 50);
   doc.moveTo(50, doc.y + 10).lineTo(550, doc.y + 10).stroke(); 
    doc.moveDown(2);

    const headerY = doc.y;

    doc
    .fontSize(11)
    .font('Helvetica-Bold')
    .text('Product', 50, headerY, { bold: true }) 
    .text('Qty', 200, headerY, { bold: true }) 
    .text('Price', 250, headerY, { bold: true })
    .text('Discount', 320, headerY, { bold: true }) 
    .text('Total (₹)', 400, headerY, { bold: true }); 
    
 
 
 let position = headerY + 20; 
 doc.fontSize(10).font('Helvetica'); 

 orderData.products.forEach(product => {
    doc.text(product.varientId.productId.productName, 50, position);
    doc.text(product.quantity, 200, position);
    doc.text(product.finalPrice, 250, position);
    
    doc.text(product.discountAmount || 0, 320, position); 
    doc.text(product.finalPrice * product.quantity, 400, position); 

    position += 20; 
});
      


    
    doc.moveTo(50, doc.y + 10).lineTo(550, doc.y + 10).stroke(); 

    doc
      .moveDown(2)
      .text(`Grand Total: ₹${orderData.totalAmount}`, { align: 'right', bold: true });

      doc.moveDown(3).fontSize(10).text('Thank you for your business!', { align: 'center' });


    doc.end();

    writeStream.on('finish', () => {
        
         resolve(invoicePath);
          });
    });

    
};




//razorpay
const paymentSuccess=async(req,res)=>{
    
    const { payment_id, order_id } = req.query;
    try {
        const order=await Order.findByIdAndUpdate(
            { 'razorpayOrderId': order_id },
            { paymentStatus: true, paymentId: payment_id, status: 'Processing' },
            { new: true }
        );
        res.render('users/successPage', { order });
    } catch (error) {
        console.error("Error updating order:", error);
        res.status(500).send("Error completing payment");
    }

}
//wishlist
const loadWishlist=async(req,res)=>{
    const userId=req.session.user;
    try{
        

    const user=await User.findById(userId)
    .populate({
        path:'wishlist.varient',
        populate:{
            path:'productId'
        }
    })
    if(!user){
        res.redirect('/login')
    }
    const wishlistCount=user.wishlist.length;
    res.render('users/wishlist',{user,wishlistCount})

   }
   catch(error){
    console.log('error',error)
   }
}

const addtoWishlist=async(req,res)=>{


    try {
        const varientId=req.params.varientId;
        const userId=req.session.user;
        if(!userId){
            return res.redirect('/login')
        }
        const user=await User.findById(userId)
        const varient=await Varient.findById(varientId)
        if (!varient) {
            return res.redirect("/wishlist")
        }
        const product=await Product.findById(varient.productId);
        if(!product){
            return res.status(404).send("product not found")
        }
        if (user && user.wishlist) {
            const existingwishlistItem = user.wishlist.find(wishlistItem => wishlistItem.varient.toString() === varientId);

       
          
    
          if (existingwishlistItem) {

            return res.redirect("/wishlist");
          } else {
            user.wishlist.push({
                varient: varientId,
            });
          }
        }
    
        await user.save();
        res.redirect('/wishlist');
        
        
        } catch (error) {
            console.log(error.message);
            return res.status(500).send("Internal Server Error");
        }
    }


const deleteWishlist=async(req,res)=>{
    try {
        const varientId=req.params.varientId;
        const userId=req.session.user;
        if(!userId){
            return res.redirect("/login");
        }
       const user=await User.findById(userId);
       
        user.wishlist=user.wishlist.filter(item=>item.varient._id.toString()!==varientId)
       await user.save();
       res.redirect('/wishlist');
    } catch (error) {
        
    }
}

const getCoupon=async(req,res)=>{
    try {
        
        const user = await User.findById(req.session.user).populate('usedCoupons');
        const usedCouponIds = user.usedCoupons.map(coupon => coupon._id);
    
        const coupons = await Coupon.find({
            _id: { $nin: usedCouponIds },  
            isActive: true,
            expiryDate: { $gt: Date.now() } 
        });

        
        res.render('users/coupen', { coupons,user });
    } catch (error) {
        console.error("Error fetching coupons:", error);
        res.status(500).send("Server error");
    }
}

const getViewCoupon=async(req,res)=>{
    try {
        const user = await User.findById(req.session.user).populate('usedCoupons');
        const usedCouponIds = user.usedCoupons.map(coupon => coupon._id);
    
        const coupons = await Coupon.find({
            _id: { $nin: usedCouponIds },  
            isActive: true,
            expiryDate: { $gt: Date.now() } 
        });
        
        res.render('users/view-coupon', { coupons, user });
    } catch (error) {
        console.error("Error fetching coupons:", error);
        res.status(500).send("Server error");
    }
};





const applyCoupon = async (req, res) => {
    const { couponCode } = req.body;

    try {
        const user=req.session.user;
        const coupon = await Coupon.findOne({ couponCode: couponCode });
        const userData=await User.findById(user)
        if (coupon) {
            if (!coupon.isActive) {
                return res.json({ success: false, message: 'Coupon is not active' });
            }

            if (coupon.expiryDate <= Date.now()) {
                return res.json({ success: false, message: 'Coupon has expired' });
            }
            

            if (userData.usedCoupons.includes(coupon._id)) {
                return res.status(400).json({ message: 'Coupon has already been used by this user' });
            }
            

            
            req.session.coupon = coupon.discountValue;
            req.session.couponCode=coupon
            
           

            return res.json({ 
                success: true, 
                coupon: { discountPercentage: coupon.discountValue }
            });
        } else {
            return res.json({ success: false, message: 'Invalid coupon code' });
        }
    } catch (error) {
        console.error(error);
        res.json({ success: false, message: 'Server error' });
    }
};

//wallet
const loadWallet=async (req,res)=>{
    try {
        const userId=req.session.user;
        
        const user=await User.findById(userId)
        
        if (!user) {

            return res.redirect('/login')
          }
      
                res.render('users/wallet',{user})
    } catch (error) {
        
    }
}
//review
const submitReview = async (req, res) => {
    try {
        const { username, comment, rating } = req.body;
        const varientId = req.params.varientId;

        const user = req.session.user;
        if (!user) {
            return res.redirect('/login')
        }

        const review = new Review({
            username,
            userId: user,
            varientId,
            comment,
            rating,
        });

        await review.save();

        res.redirect(`/product-details/${varientId}`); // Redirect back to the product detail page
    } catch (error) {
        console.log('Error submitting review:', error);
        res.status(500).send('Internal Server Error');
    }
};

// Export the functions
module.exports = {
    loadHomepage,
    loadShoppingPage,
    loadProductDetails,
    loadSignUp,
    continueSignup,
    verifyOtp,
    loadLogin,
    pageNotFound,
    login,
    logout,
    loadForgotPassword,
    handleForgotPassword,
    loadResetPassword,
    handleResetPassword,
    verifyResetOtp,
    resendOtp,
    resetResendOtp,
    //profile
    viewProfile,
    loadEditProfile,
    editProfile,
    loadchangepassword,
    changepassword,
    validatePassword,
    //cart
    loadCartList,
    addtoCart,
    deleteCart,
    updateCartQuantity,
    updateCartTotal,
    loadCheckout,
    saveBuildingAddress,
    saveAddress,
    //order
    placeOrder,
    loadorderHistory,
    loadViewProduct,
    
    returnOrder,
    statusChange,
    loadSuccess,
    generateInvoice,
    downloadInvoice,
    //razorpay
    paymentSuccess,

    //wishlist
    loadWishlist,
    addtoWishlist,
    deleteWishlist,
    //coupen
    getCoupon,
    applyCoupon,
    getViewCoupon,
    //wallet
    loadWallet,
    retryPayment,
    paymentFailed,
    //review
    submitReview
}
