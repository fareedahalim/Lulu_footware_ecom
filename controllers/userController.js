const User = require("../models/userModel");
const bcrypt = require("bcrypt")
const Occasion = require('../models/occasionModel');
const Brand = require('../models/brandModel');
const Product = require('../models/productModel'); // Adjust the path as necessary
const Varient = require('../models/varientModel');
const Offer = require('../models/offerModel');
const Address=require("../models/addressModel");
const Order =require("../models/orderModel");
const otpGenerator = require('otp-generator');
const nodemailer = require('nodemailer');
const Coupon=require('../models/coupenModel')
const { ProfilingLevel, ObjectId } = require("mongodb");
require("dotenv").config();
const Razorpay = require('razorpay');
const crypto = require('crypto');
const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');
// const { default: orders } = require("razorpay/dist/types/orders");

// Initialize Razorpay instance
const razorpayInstance = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID, // Use environment variables for sensitive data
    key_secret: process.env.RAZORPAY_KEY_SECRET,
});


//page not found
const pageNotFound = async (req, res) => {
    try {

        res.render("page-404")
    } catch (error) {
        res.redirect("/pageNotFound")
    }
}

//load home page
// const loadHomepage = async (req, res) => {
//     try {
//         // Check if the user is logged in by checking session
//         const user = req.session.user;
        
        
         
//          if(user){
//             const userDetails=await User.findById({_id:user})
//             // console.log(userDetails.username)
//         if(userDetails.isBlocked===true)
//         {
//             req.session.destroy((err)=>{
//                 if(err){
//                     console.log("Session destruction error",err.message)
//                     return res.redirect("/pageNotFound");
//                 }
//                 return res.redirect("/login")
//             })
//         }
//     }
//         let userData = null;

//         if (user) {
//             // If the user is logged in, fetch the user data from the database
//             userData = await User.findOne({ _id: user });
//         }


//         // Fetch all products and populate the brand and category fields
//         const products = await Product.find().populate('brand').populate('category');

//         // For each product, fetch its variants
//         const productsWithVariants = await Promise.all(products.map(async product => {
//             const variants = await Varient.find({ productId: product._id });
//             return {
//                 ...product.toObject(),
//                 variants
//             };
//         }));

//         // Render the home page with the fetched products, their variants, and user data
//        return res.render('users/home', { user: userData, products: productsWithVariants});

//     } catch (error) {
//         console.log('Error loading home page:', error.message);
//         res.status(500).send('Internal Server Error');
//     }
// };


const loadHomepage = async (req, res) => {
    try {
        // Check if the user is logged in by checking session
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

        
        const products = await Product.find({isBlocked:false}).populate('brand').populate('category');

        

        
        const productsWithVariants = await Promise.all(products.map(async product => {
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

        // Render the home page with the fetched products, their variants, and user data
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

        const searchInput = req.query.search ? req.query.search.trim() : '';  // Capture search input

        // Build filters for category, brand, and color
        const filter = {isBlocked: false};
        if (req.query.category) filter.category = req.query.category;
        if (req.query.brand) filter.brand = req.query.brand;

        // Build price filter using minPrice and maxPrice
        const priceFilter = {};
        if (req.query.minPrice && req.query.maxPrice) {
            priceFilter['variants.price'] = {
                $gte: parseFloat(req.query.minPrice),
                $lte: parseFloat(req.query.maxPrice)
            };
        }

        // Variant color filtering
        let variantFilter = {};
        if (req.query.color) {
            variantFilter.color = req.query.color;
        }

        const user = req.session.user;
        const userData = user ? await User.findById(user) : null;

        // Fetch products based on category, brand, and price filters
        const products = await Product.find(filter)
            .populate('brand')
            .populate('category')
            .skip(skip)
            .limit(limit);

        // Fetch variants matching the color filter and price filter
        const variants = await Varient.find({
            ...variantFilter,
            ...priceFilter
        });

        // Ensure unique products by mapping variants to products
        const uniqueProductsMap = new Map();
        
        for (const product of products) {
            const productVariants = variants.filter(variant => variant.productId.equals(product._id));
            if (productVariants.length > 0) {
                for (const variant of productVariants) {
                    let finalPrice = variant.price;
                    let productDiscount = 0;
                    let brandDiscount = 0;

                    // Check for product-specific offer
                    const productOffer = await Offer.findOne({ entityId: product._id });
                    if (productOffer) {
                        productDiscount = (productOffer.discountPercentage / 100) * variant.price;
                    }

                    // Check for brand-specific offer
                    const brandOffer = await Offer.findOne({ entityId: product.brand._id });
                    if (brandOffer) {
                        brandDiscount = (brandOffer.discountPercentage / 100) * variant.price;
                    }

                    // Apply the greatest discount
                    const maxDiscount = Math.max(productDiscount, brandDiscount);
                    finalPrice = variant.price - maxDiscount;
                    variant.finalPrice = finalPrice; // Add final price to variant object
                }

                uniqueProductsMap.set(product._id.toString(), {
                    ...product.toObject(),
                    variants: productVariants
                });
            }
        }

        const filteredProducts = Array.from(uniqueProductsMap.values());

        const occasionData = await Occasion.find();
        const brandData = await Brand.find();

        const uniqueColors = [...new Set(variants.map(variant => variant.color))];

        const productsCount = await Product.countDocuments(filter);

        return res.render('users/shop', {
            user: userData,
            products: filteredProducts,
            occasionData,
            brandData,
            uniqueColors,
            currentPage: page,
            totalPages: Math.ceil(productsCount / limit),
            searchInput,  // Pass the search input to the view
        });

    } catch (error) {
        console.error('Error loading shop page:', error.message);
        return res.status(500).send('Internal Server Error');
    }
};


// const loadShoppingPage = async (req, res) => {
//     try {
//         const page = parseInt(req.query.page) || 1;
//         const limit = 7; // Default limit for products per page
//         const skip = (page - 1) * limit;

//         const searchInput = req.query.search ? req.query.search.trim() : '';
//         const filter = {};
        
//         // Add filters based on the category and brand
//         if (req.query.category) filter.category = req.query.category;
//         if (req.query.brand) filter.brand = req.query.brand;

//         // Build price filter
//         const priceFilter = {};
//         if (req.query.minPrice && req.query.maxPrice) {
//             priceFilter['variants.price'] = {
//                 $gte: parseFloat(req.query.minPrice),
//                 $lte: parseFloat(req.query.maxPrice)
//             };
//         }

//         // Variant color filtering
//         let variantFilter = {};
//         if (req.query.color) {
//             variantFilter.color = req.query.color;
//         }

//         const user = req.session.user;
//         const userData = user ? await User.findById(user) : null;

//         // Search filtering
//         if (searchInput) {
//             filter.$or = [
//                 { name: { $regex: searchInput, $options: 'i' } },
//                 { description: { $regex: searchInput, $options: 'i' } }
//             ];
//         }

//         // Fetch all products with applied filters and search
//         const products = await Product.find(filter)
//             .populate('brand')
//             .populate('category');

//         // Fetch variants based on the variant filter and price filter
//         const variants = await Varient.find({
//             ...variantFilter,
//             ...priceFilter
//         });

//         const uniqueProductsMap = new Map();

//         // Iterate through products and apply offer discounts
//         for (const product of products) {
//             const productVariants = variants.filter(variant => variant.productId.equals(product._id));
//             if (productVariants.length > 0) {
//                 for (const variant of productVariants) {
//                     let finalPrice = variant.price;
//                     let productDiscount = 0;
//                     let brandDiscount = 0;

//                     // Check for product-specific offer
//                     const productOffer = await Offer.findOne({ entityId: product._id });
//                     if (productOffer) {
//                         productDiscount = (productOffer.discountPercentage / 100) * variant.price;
//                     }

//                     // Check for brand-specific offer
//                     const brandOffer = await Offer.findOne({ entityId: product.brand._id });
//                     if (brandOffer) {
//                         brandDiscount = (brandOffer.discountPercentage / 100) * variant.price;
//                     }

//                     // Apply the greatest discount
//                     const maxDiscount = Math.max(productDiscount, brandDiscount);
//                     finalPrice = variant.price - maxDiscount;
//                     variant.finalPrice = finalPrice; // Add final price to variant object
//                 }

//                 uniqueProductsMap.set(product._id.toString(), {
//                     ...product.toObject(),
//                     variants: productVariants
//                 });
//             }
//         }

//         // Convert the map to an array of products
//         const filteredProducts = Array.from(uniqueProductsMap.values());

//         // Implement pagination on filtered products
//         const paginatedProducts = filteredProducts.slice(skip, skip + limit);
//         const productsCount = filteredProducts.length; // Count after filtering

//         const occasionData = await Occasion.find();
//         const brandData = await Brand.find();

//         const uniqueColors = [...new Set(variants.map(variant => variant.color))];

//         const categoryQuery = req.query.category || '';
//         const brandQuery = req.query.brand || '';
//         return res.render('users/shop', {
//             user: userData,
//             products: paginatedProducts, // Use paginated products
//             occasionData,
//             brandData,
//             uniqueColors,
//             currentPage: page,
//             totalPages: Math.ceil(productsCount / limit), // This should reflect the count of filtered products
//             searchInput, 
//             categoryQuery, 
//             brandQuery,
//         });

//     } catch (error) {
//         console.error('Error loading shop page:', error.message);
//         return res.status(500).send('Internal Server Error');
//     }
// };

const loadProductDetails = async (req, res) => {
    try {
        const user = req.session.user;
        let userData = null;

        // Get variantId from request parameters
        const varientId = req.params.varientId;
        console.log("variantId:", varientId);
        
        if (user) {
            userData = await User.findById(user);
            if (!userData) {
                return res.status(404).send('User not found');
            }
        }
            
        const varientAll=await Varient.find();
        
        const varient = await Varient.findById(varientId);
        // console.log("varientAll",varientAll[10].productId,varient.productId)
        if (!varient) {
            return res.status(404).send('Variant not found');
        }

        const product = await Product.findById(varient.productId).populate('brand category');
        if (!product) {
            return res.status(404).send('Product not found');
        }
        console.log(product);

        let finalPrice = varient.price;
        let productDiscount = 0;
        let brandDiscount = 0;

        // Check for product-specific offer
        const productOffer = await Offer.findOne({
            entityId: varient.productId 
            
        });

        if (productOffer) {
            productDiscount = (productOffer.discountPercentage / 100) * varient.price;
            console.log("Product offer discount:", productDiscount);
        }

        // Check for brand-specific offer
        const brandOffer = await Offer.findOne({
            entityId: product.brand._id  // Use the product's brand ID
            
        });

        if (brandOffer) {
            brandDiscount = (brandOffer.discountPercentage / 100) * varient.price;
            console.log("Brand offer discount:", brandDiscount);
        }

        // Apply the greatest discount
        const maxDiscount = Math.max(productDiscount, brandDiscount);
        finalPrice = varient.price - maxDiscount;
        console.log("Final price after applying greatest discount:", finalPrice);

        return res.render('users/singleProduct', { user: userData, product, varient, finalPrice,varientAll });

    } catch (error) {
        console.log('Error loading product details:', error);
        res.status(500).send('Internal Server Error');
    }
};


const loadSignUp = async (req, res) => {
    try {

        res.render('users/signUp')
        console.log("load signup")
    } catch (error) {
        console.log(error.message)
    }
}
function generateNumericOtp(length) {
    let otp = '';
    for (let i = 0; i < length; i++) {
        otp += Math.floor(Math.random() * 10);  // Generates a digit between 0 and 9
    }
    return otp;
}


function generateReferralCode() {
    return crypto.randomBytes(3).toString('hex'); // Generates a 6-character code
  }

  const continueSignup = async (req, res) => {
    try {
        const { username, email, mobile, password, confirmPassword ,referralCode} = req.body;
        console.log("referalCode",referralCode)
        // Validate the form fields
        if (password !== confirmPassword) {
            return res.render("users/signUp", { message: "Passwords do not match" });
        }

        // Check if the user already exists
        const existingUser = await User.findOne({ email });

        // If the user exists and is blocked, do not allow signup
        if (existingUser && existingUser.isBlocked) {
            return res.render("users/signUp", { message: "Your account is blocked, you cannot sign up." });
        }

        // If the user exists and is not blocked, prevent duplicate signup
        if (existingUser) {
            return res.render("users/signUp", { message: "User already exists" });
        }

        // Check if the mobile number already exists
        const mobileExists = await User.findOne({ mobile });
        if (mobileExists) {
            return res.render("users/signUp", { message: "Mobile number already exists. Please check and try again." });
        }
         
        // Generate OTP
        const generatedOtp = generateNumericOtp(6);

        // Send OTP via email
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
            console.log('Email sent: ' + info.response);
        });

        // Store the OTP and user data in the session
        req.session.userOtp = generatedOtp;
        req.session.userData = { username, email, mobile, password,referralCode };
        req.session.otpExpireTime = Date.now() + 5 * 60 * 1000; // OTP valid for 5 minutes

        // Render the OTP verification page with a timer
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
    console.log(email);
    req.session.userOtp = generatedOtp;
    req.session.otpExpireTime = Date.now() + 1 * 60 * 1000;
        // Send OTP via email
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
            console.log('Email sent: ' + info.response);
        });

        
        // req.session.otpExpireTime = Date.now() + 1 * 60 * 1000; // OTP valid for 5 minutes

        
        console.log("OTP sent:", generatedOtp);
        console.log(email)
        res.render("users/otp", { user: email, otpSent: true });
    } catch (error) {
        console.error("Error during signup:", error);
        res.status(500).send('Internal server error');
    }
}

// 
const verifyOtp = async (req, res) => {
    console.log(req.body,"=eq.bo")
    const { otp} = req.body;
    const referralCode = req.session.userData.referralCode; 
    console.log("referralCode=",referralCode)
  
    if (otp === req.session.userOtp) {
        console.log(otp,"=otp")
        const user = req.session.userData;
        let referralOwner = null;
        if(referralCode){
            console.log("entering for finding th user exist or not")
            referralOwner = await User.findOne({ referalCode: referralCode });
            console.log("referralOwner",referralOwner);
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
            console.log(" saveUserData.wallet=", saveUserData.wallet)
            referralOwner.wallet += 500;
            
            await referralOwner.save();
        }
      console.log(saveUserData,"save user data")
        await saveUserData.save();

        req.session.user = saveUserData._id;
        return res.json({ success: true, redirect: "/login" });
    } else {
        return res.json({ success: false, errorMessage: "Invalid OTP, please try again." });
    }
};
//load loginpage
const loadLogin = async (req, res) => {
    try {
        if(!req.session.user)
        {
        // return res.render("users/login");
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
        // const findUser=await User.findOne({isAdmin:0,email:email})
        const findUser = await User.findOne({ email })
        if (!findUser) {
            return res.render("users/login", { errorMessage: "User is not found" })
        }
        if (findUser.isBlocked) {
            return res.render("users/login", { errorMessage: "User is blocked by admin" })
        }

        const passwordMatch = await bcrypt.compare(password, findUser.password);
console.log(passwordMatch)
        if (!passwordMatch) {
            return res.render("users/login", { errorMessage: "Incorrect email or password" });
        }
        req.session.user = findUser._id;
        console.log(req.session.user._id);
        console.log("is logged")
        res.redirect("/home")
    } catch (error) {

        console.log("login error", error)
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
    console.log("load forgot password")
    res.render('users/forgotPassword', { message: req.session.message });
    req.session.message = null;
};

const verifyResetOtp = async (req, res) => {
    try {
        console.log(req.body,"req.body")
        const { otp } = req.body;
        console.log(otp,"kkkkkkkkkkkkkkkkk")
        console.log(req.session.userOtp)
        // Compare OTP with the session OTP
        if (otp === req.session.userOtp) {
            console.log("kkkkkkkkkkkkkkkk00000000000k")  
            return res.render('users/resetpassword'); // Redirect to reset password page
        } else {
            return res.render("users/resetOtp", { errorMessage: "Invalid OTP, please try again" });
        }
    } catch (error) {
        console.error("Error verifying OTP:", error);
        res.status(500).send("Server error");
    }
};

// Handle Forgot Password
const handleForgotPassword = async (req, res) => {
    try {
        console.log("opo")
        const { email } = req.body;
        const user = await User.findOne({ email });

        if (!user) {
            req.session.message = "Email not found";
            return res.redirect('/forgot-password');
        }

        // Generate OTP and send via email
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
            console.log('Email sent: ' + info.response);
        });

        // Store the OTP and email in session for verification
        req.session.userOtp = generatedOtp;
        req.session.resetEmail = email;
        
        console.log("OTP sent---:", generatedOtp);
        res.render("users/resetOtp", {  otpSent: true });
    } catch (error) {
        console.error("Error during forgot password:", error);
        res.status(500).send("Server error");
    }
};


// Load Reset Password Page
const loadResetPassword = (req, res) => {
    if (!req.session.resetOtp) {
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
        // user.password = await bcrypt.hash(password, 10);
        await user.save();

        // Clear session data
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


const editProfile=async(req,res)=>{
    try {
        const userId = req.params.id;
        console.log("userId:",userId)
        const { username, email, mobile } = req.body;

        // Validate inputs
        if (!username || !email || !mobile) {
            return res.status(400).json({ message: 'All fields are required' });
        }

        // Update user in the database
        const user = await User.findByIdAndUpdate(userId, { username, email, mobile }, { new: true });

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        res.json({ message: 'Profile updated successfully' });
    } catch (error) {
        console.error('Error updating user:', error);
        res.status(500).json({ message: 'Server error' });
    }

}
const loadchangepassword=async(req,res)=>{
    if (req.session.user) {
        res.render('users/changePassword');
    } else {
        res.redirect('/login'); 
    }
}
const changepassword=async(req,res)=>{
    
    const {oldPassword,newPassword,confirmPassword}=req.body;
    console.log("oldPassword",oldPassword);
    console.log("newPassword",newPassword);
    
    const userId=req.session.user;
    console.log("userId",userId)

    try {
        if(newPassword!==confirmPassword){
            return res.render('users/changePassword',{message:"Password do not match"})
        }
      const user=await User.findById(userId);
      if(!user){
        return res.status(404).send("User not found")
      } 
      const isPasswordMatch=await bcrypt.compare(oldPassword,user.password);
      console.log("isPasswordMatch",isPasswordMatch)
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

///user Cart
const loadCartList = async (req, res) => {
    try {
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

        // Calculate the final price for each cart item
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
            cartItem.finalPrice = varient.price - maxDiscount;  // Attach finalPrice to each cart item
        }

        const cartCount = user.cart.length;

        // Render the cart page with the updated finalPrice for each cart item
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
        console.log("userId:",userId)
        const varientId = req.params.varientId;

        // Find the user by ID
        const user = await User.findById(userId);
        console.log("user:")

        if (!user) {
            return res.status(404).send('User not found');
        }

        // Filter out the item with the given variant ID
        user.cart = user.cart.filter(item => item.varient._id.toString() !== varientId);

        // Save the updated user
        await user.save();

        res.redirect('/cartList'); // Redirect to the cart page after removal
    } catch (error) {
        console.error('Error removing item from cart:', error);
        res.status(500).send('Internal Server Error');
    }
};

const updateCartQuantity=async(req,res)=>{
    console.log("update quantity")
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
  
      // Fetch the user's cart from the User collection
      const user = await User.findById(userId);
  
      if (!user || !user.cart || user.cart.length === 0) {
        return res.status(404).json({ error: 'Cart not found' });
      }
  
      // Calculate the total price of items in the cart
      let total = 0;
      for (const item of user.cart) {
        const varient = await Product.findById(item.varient._id); // Fetch the latest variant data
        if (varient) {
          total += varient.price * item.quantity;
        }
      }
       
      // Send the total amount back in the response
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
        console.log(req.session.address,'sdfghjk444444')
        if (req.session.address){
            addressChecked=1
        }
        console.log(addressChecked,"addressChecked")
        // If user is not logged in, redirect to login
        if (!user) {
            return res.redirect("/login");
        }

        // Fetch user cart with populated variants and product details
        const userCart = await User.findById(user)
            .populate({
                path: 'cart.varient',
                populate: {
                    path: 'productId',
                },
            });
            console.log("userCart.items.length=",userCart.cart.length)
          if(userCart.cart.length===0){

            return res.redirect("/cartList")
          }
        let sum = 0;
        let finalPrice;

        // Iterate through each cart item to calculate the final price and total sum
        for (let cartItem of userCart.cart) {
            const varient = cartItem.varient;
            
            if(varient.productId.isBlocked==true||varient.stock<=0){
            
                return res.redirect("/shop")
            }
            finalPrice = varient.price;

            let productDiscount = 0;
            let brandDiscount = 0;

            // Check for product-specific offers
            const productOffer = await Offer.findOne({ entityId: varient.productId._id });
            if (productOffer) {
                productDiscount = (productOffer.discountPercentage / 100) * varient.price;
            }

            // Check for brand-specific offers
            const brandOffer = await Offer.findOne({ entityId: varient.productId.brand });
            if (brandOffer) {
                brandDiscount = (brandOffer.discountPercentage / 100) * varient.price;
            }

            // Calculate the maximum discount and final price
            const maxDiscount = Math.max(productDiscount, brandDiscount);
            cartItem.finalPrice = varient.price - maxDiscount;
          
            // Add the final price * quantity to the total sum
            sum += cartItem.finalPrice*cartItem.quantity
            console.log("sum=",sum);
            
        }

        

        // Fetch the user's address
        const address = await Address.find({ user: user });

        // Render the checkout page with the necessary data
        res.render('users/checkout', { address, userCart, sum, addressChecked: addressChecked, finalPrice,user });

    } catch (error) {
        // Log the error and handle it by showing an error page or message
        console.error("Error in loadCheckout:", error);
        res.status(500).send("An error occurred during the checkout process. Please try again later.");
    }
};

const saveBuildingAddress=async(req,res)=>{
    try {
        console.log("ishksdgfkjsdgbfkjb");
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
    // console.log(req.body.existing_address_id);
    try {
        const addressId = req.body.existing_address_id;
        req.session.address = addressId;
        console.log( req.session.address,"jhghjg----------")
        res.redirect('/checkout')
    } catch (error) {
     console.error(error);   
    }
}



const placeOrder = async (req, res) => {
    try {
        // Fetch the user details along with the cart
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
        console.log(couponDiscount,"copon")
        // Calculate final prices and discounts
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
        console.log("bjkbkjbkjb00000000000000000000000000000");
        let discount=0;
        if (couponDiscount) {
          
           discount=Math.floor(sum*(couponDiscount/100))
           console.log("discount=",discount);
            finalSum = sum - (sum * (couponDiscount / 100));
            console.log(finalSum)
            
        } else {
            console.log("else")
            finalSum = sum;
        }

        
        const paymentMethod = req.body.payment_method;

        if (paymentMethod === 'Wallet') {

              if (user.wallet < finalSum) {
                req.flash('error', 'Insufficient Wallet Balance');
                return res.redirect('/checkout'); // Redirect back to the checkout page
            }
        
            // Create and save the order first
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
                payment: 'Wallet'  // Set payment method to Wallet
            });
        
            // Save the new order to the database
            await newOrder.save();
        
            // Now, deduct from wallet and add the transaction
            user.wallet -= finalSum;
        
            user.walletTransactions.push({
                type: 'debit',
                amount: finalSum,
                description: `Payment for order #${newOrder._id}`
            });
        
            // Save the user with the updated wallet and transactions
            await user.save();
        
            // Store the order in session and proceed
            req.session.order = newOrder;
            console.log("Order placed successfully with Wallet:", newOrder);
        
            return res.redirect('/success-page');
        }
        
        // Existing Razorpay and COD payment methods here
        if (paymentMethod === 'Razorpay') {
            console.log("Entering for razorpay");
        
            // Prepare for Razorpay payment
            const razorpayOrder = {
                amount: finalSum * 100, // Convert to paise
                currency: 'INR',
                receipt: `order_${new Date().getTime()}`,
            };
        
            // Create a Razorpay order using their API
            const razorpayResponse = await razorpayInstance.orders.create(razorpayOrder);
            console.log("Razorpay response:", razorpayResponse);

            // Create a new order instance using the Order model
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
                razorpayOrderId: razorpayResponse.id, // Save Razorpay order ID
            });
        
            // Save the order in the database
            await newOrder.save();
        
            // Store the order in session for future reference
            req.session.order = newOrder;
        
            // Redirect to Razorpay checkout page
            return res.render('users/razorpay', {
                key_id: process.env.RAZORPAY_KEY_ID,
                orderId: razorpayResponse.id,
                amount: finalSum,
                currency: 'INR',
                user: req.session.user, // Make sure you're passing the correct user object
            });
        }
        
        // Default COD payment logic
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

        console.log("last cionsole",finalSum)
        await newOrder.save();
        req.session.order=newOrder;
        console.log("Order created successfully:", newOrder);
        return res.redirect('/success-page');
       
    } catch (error) {
        console.error("Error placing order:", error);
        res.status(500).send("Internal Server Error");
    }
};
const loadSuccess = async (req, res) => {
    const user=req.session.user;

    try {
        console.log("load success");
      
        // Retrieve order data from session
        const newOrderData = req.session.order;
        console.log("newOrderData:-",newOrderData)

        if (!newOrderData) {
            return res.render('users/paymentFailed', { message: 'No order data found' });
        }
       
        const order = await Order.findById(newOrderData._id);

        if (!order) {
            return res.render('users/paymentFailed', { message: 'Order not found' });
        }

        // Update the payment status to true and set status to 'Processing'
        order.paymentStatus = true;
        order.status = 'Processing'; // Assuming the status changes to Processing after successful payment

        // Save the updated order
        await order.save();  // 
       

        // Update stock for the variants
console.log("Thequantity become decreasing")
        for (const item of newOrderData.products) {
            const varient = await Varient.findById(item.varientId);
            if (varient) {
                varient.stock = Math.max(0, varient.stock - item.quantity);
                await varient.save();
            }
        }

        // Clear session order data after saving the order
        req.session.newOrder = null;
        req.session.address = "";

        // Clear the user's cart
        const user = await User.findById(req.session.user);
        console.log("The cart become empty")
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

        // Find the order by its ID and populate the variant and product details
        const order = await Order.findById(orderId)
            .populate({
                path: 'products.varientId',
                populate: { path: 'productId' }
            });
            console.log(order)
        if (!order) {
            return res.status(404).send('Order not found');
        }

        // Render the order summary page
        res.render('users/view-product', { order });
    } catch (error) {
        console.error("Error fetching order details:", error);
        res.status(500).send("Internal Server Error");
    }
}
// const reasonpage=async(req,res)=>{
//     try {
//         const orderId=req.params.orderId;
//         const order=await Order.findById(orderId)
//         if(!order){
//             console.error("order is not found");
//             return res.status(404).send("order is not found")
//         }
//         res.render('users/order-reason',{orderId,order})
//     } catch (error) {
//         console.error("Error fetching order details:", error.message);
//         res.status(500).send("Internal Server Error");
//     }
// }
//cancel Order

 const statusChange = async (req, res) => {
    try {
        const user = req.session.user;
        const orderId = req.params.orderId;
        const order = await Order.findById(orderId);

        if (!order) {
            return res.status(404).json({ message: 'Order not found' });
        }

        if (order.status === 'Cancelled') {
            return res.status(400).json({ message: 'Order is already cancelled' });
        }

    
        order.status = 'Cancelled';

        // Handle stock update for each product variant in the order
        for (const item of order.products) {
            const variant = await Varient.findById(item.varientId); // Correct varientId

            if (variant) {
                variant.stock += item.quantity;  // Revert the stock
                await variant.save();
            }
        }

        // Handle wallet refund (if applicable)
        const refundAmount = order.totalAmount; // or however you calculate refund
        const userAccount = await User.findById(user);
        if (!userAccount) {
            return res.status(404).json({ message: 'User not found' });
        }
        if (userAccount.wallet === undefined || userAccount.wallet === null) {
            userAccount.wallet = 0; // Initialize as a number
        }
        if (!isNaN(refundAmount) && refundAmount > 0) {
            userAccount.wallet += refundAmount; 
            
            userAccount.walletTransactions.push({
                type: 'credit',
                amount: refundAmount,
                description: `Refund for order #${order._id}`
            });// Add the refund to the wallet
            await userAccount.save(); // Save the user document after updating wallet
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

        // Update order status to 'Returned'
        order.status = 'Returned';

        // Update the stock of the variants
        for (const item of order.products) {
            const varient = await Varient.findById(item.varientId);
            if (varient) {
                varient.stock += item.quantity; // Deduct stock for returned orders
                await varient.save();
            }
        }

        const refundAmount = order.totalAmount; // or however you calculate refund
        const userAccount = await User.findById(user);
        if (!userAccount) {
            return res.status(404).json({ message: 'User not found' });
        }
        if (userAccount.wallet === undefined || userAccount.wallet === null) {
            userAccount.wallet = 0; // Initialize as a number
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

// const paymentFailed = async (req, res) => {
//     console.log("payment failed")
//    // const orderId = req.session.orderId; // Use the stored order ID in the session
//         console.log("orderId",orderId)
//     try {
//         // Update the order status to 'Failed'
//         const order = await Order.findOneAndUpdate(
//             { _id: orderId },
//             { status: 'Failed', paymentStatus: false }, // Set paymentStatus to false
//             { new: true }
//         );

//         if (!order) {
//             return res.status(404).render('users/paymentFailed', { message: 'Order not found' });
//         }

//         // Render the paymentFailed page with the retry button
//         res.render('users/paymentFailed', { message: 'Payment failed, please try again.', orderId: order._id });
//     } catch (error) {
//         console.error("Error updating order status to Failed:", error);
//         return res.status(500).send("Error updating order status");
//     }
// };
const paymentFailed = async (req, res) => {
    console.log("payment failed");

    const orderId = req.session.orderId; // Retrieve the stored order ID from the session

    if (!orderId) {
        return res.render('users/paymentFailed', { message: 'No order data found in session' });
    }

    try {
        // Update the order status to 'Failed'
        const order = await Order.findOneAndUpdate(
            { _id: orderId }, // Use the orderId from the session
            { status: 'Failed', paymentStatus: false }, // Set status to 'Failed' and paymentStatus to false
            { new: true }
        );

        if (!order) {
            return res.status(404).render('users/paymentFailed', { message: 'Order not found' });
        }

        // Render the failed payment page with the message
        return res.render('users/paymentFailed', { message: 'Payment failed. Please try again.' });
    } catch (error) {
        console.error("Error updating order after payment failed:", error);
        return res.status(500).send("Error updating order status after failed payment");
    }
};





const retryPayment = async (req, res) => {
    const orderId = req.params.orderId;
    console.log("Entering retry");
    const order = await Order.findById(orderId).populate({
        path: 'products.varientId',
        populate: {
            path: 'productId' // This ensures that productId is also populated
        }
    });
    
    for (let orderItem of order.products) {
        const varient = orderItem.varientId;

      
        // console.log("varient.stock=",varient.stock)
        // console.log("orderItem.quantity=",orderItem.quantity)
        // console.log("varient.price=",varient.price)
        // console.log("orderItem.productPrice=",orderItem.productPrice)
       
        // varient.stock!==orderItem.quantity||
         if(varient.productId.isBlocked==true||varient.price!==orderItem.productPrice){
            order.status='Cancelled'
            await order.save();
            req.flash('error', 'Product is not available');
            return res.redirect("/order-history")
        }
        let originalPrice = varient.price;
        let finalPrice = originalPrice
    }
    if (!order) {
        return res.status(404).send("Order not found");
    }

    const instance = new Razorpay({
        key_id: process.env.RAZORPAY_KEY_ID,
        key_secret: process.env.RAZORPAY_KEY_SECRET
    });

    const razorpayOrder = await instance.orders.create({
        amount: order.totalAmount * 100,  // Amount in paise
        currency: 'INR',
        receipt: `receipt_${order._id}`,
        payment_capture: 1,  // Auto capture payment
    });

    // Store the new Razorpay Order ID in the database if necessary
    // order.razorpayOrderId = razorpayOrder.id;
    // await order.save();

    // Render the retry payment page with the correct data
    res.render('users/retryPayment', {
        key_id: process.env.RAZORPAY_KEY_ID,
        orderId: razorpayOrder.id,  // Razorpay Order ID
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
                    model: 'Product' // Specify the Product model
                }
            }); // Fetch the order based on orderId

        if (!order) {
            return res.status(404).send('Order not found');
        }

        // Generate the invoice data
        const orderData = {
            address: order.address[0], // Adjust based on your structure
            products: order.products,
            subtotal: order.subtotal,
            discountAmount: order.discountAmount,
            totalAmount: order.totalAmount,
        };

        // Generate the invoice and get the invoice path
        const invoicePath = await generateInvoice(orderId, orderData); // Ensure generateInvoice returns the path

        // Check if the invoice file exists
        if (!fs.existsSync(invoicePath)) {
            return res.status(404).send('Invoice not found');
        }

        // Send the PDF to the client
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

// Modify the generateInvoice function to access product names correctly
const generateInvoice = (orderId, orderData) => {
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
       .text('Lulu Footwear ', 400, 50)   // Align to the right side of the page
       .text('Thamarasseri, Kozhikkode, Kerala', 400)
       .text('Email: lulu@gmail.com', 400)
       .text('Phone: +9024175689', 400);


       doc.moveDown(2);
    // Horizontal Line
    doc.moveTo(50, doc.y)  // Use the current Y position instead of hardcoding
   .lineTo(550, doc.y)
   .stroke();

    // Invoice Title
    
   // Option to place it at a specific height (e.g., halfway down the page)
// const pageHeight = doc.page.height; // Get the page height
// const verticalPosition = pageHeight / 2 - 10;  // Adjust the value to center vertically

// doc.fontSize(15)
//    .text('INVOICE', 0, verticalPosition, {align: 'center', underline: true});

doc.moveDown(1)
   .fontSize(15)
   .text('INVOICE', 0, doc.y, { align: 'center', underline: true }) // Centered 'INVOICE'

// Horizontal Line just below the centered 'INVOICE' title
doc.moveTo(50, doc.y + 10).lineTo(550, doc.y + 10).stroke(); // Adds a small gap before the line

// Left-aligned Invoice Details
doc.moveDown(2);
doc  
   .fontSize(10)
   .text(`Invoice Date: ${new Date().toDateString()}`, 50) // Explicitly set the X position to 50 for left alignment
   .text(`Customer Name: ${orderData.address.username}`, 50)
   .text(`Contact Number: ${orderData.address.mobile}`, 50)
   .text(`Shipping Address: ${orderData.address.address}, ${orderData.address.city}, ${orderData.address.state}, India, ${orderData.address.pincode}`, 50);
   doc.moveTo(50, doc.y + 10).lineTo(550, doc.y + 10).stroke(); // Adds a small gap before the line
    doc.moveDown(2);

    const headerY = doc.y;

    doc
    .fontSize(11)
    .font('Helvetica-Bold')
    .text('Product', 50, headerY, { bold: true }) // Start at the current Y position
    .text('Qty', 200, headerY, { bold: true }) // Same Y position for alignment
    .text('Price', 250, headerY, { bold: true }) // Same Y position for alignment
    .text('Discount', 320, headerY, { bold: true }) // Same Y position for alignment
    .text('Total (₹)', 400, headerY, { bold: true }); // Same Y position for alignment
    
 
 // Position for the product rows
 let position = headerY + 20; 
 doc.fontSize(10).font('Helvetica'); 

 orderData.products.forEach(product => {
    doc.text(product.varientId.productId.productName, 50, position);
    doc.text(product.quantity, 200, position);
    doc.text(product.finalPrice, 250, position);
    // Assuming `product.discountAmount` and `product.totalAmount` are part of orderData
    doc.text(product.discountAmount || 0, 320, position); // Display discount amount
    doc.text(product.finalPrice * product.quantity, 400, position); // Calculate total amount if not stored in product

    position += 20; // Move to the next line for the next product
});
      

    // doc.text(`Subtotal: Rs.${orderData.subtotal}`);
    // doc.text(orderData.discountAmount,250, position);
    // doc.text(orderData.totalAmount);

    // position += 20;   // Move to the next line
    doc.moveTo(50, doc.y + 10).lineTo(550, doc.y + 10).stroke(); // Adds a small gap before the line

    doc
      .moveDown(2)
      .text(`Grand Total: ₹${orderData.totalAmount}`, { align: 'right', bold: true });

      doc.moveDown(3).fontSize(10).text('Thank you for your business!', { align: 'center' });


    doc.end();

    writeStream.on('finish', () => {
        console.log(`Invoice generated successfully: ${invoicePath}`);
    });

    return invoicePath; // Return the invoice path
};




//razorpay
const paymentSuccess=async(req,res)=>{
    console.log("payment success")
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
        if (!varient || varient.stock <= 0) {
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
//coupon
// const getCoupon=async(req,res)=>{
//     try {
//         const user=await User.findById(req.session.user);
        
//         const coupons=await Coupon.find();
//         res.render('users/coupen',{user,coupons})
//     } catch (error) {
//         console.error('Error fetching coupons:', error);
//         res.status(500).send('Server error');
//     }
// }
const getCoupon=async(req,res)=>{
    try {
        console.log("profile coupon")
        const user = await User.findById(req.session.user).populate('usedCoupons');
        const usedCouponIds = user.usedCoupons.map(coupon => coupon._id);
        console.log("usedCouponIds=",usedCouponIds)
        const coupons = await Coupon.find({
            _id: { $nin: usedCouponIds },  // Exclude used coupons
            isActive: true,
            expiryDate: { $gt: Date.now() }  // Only active and valid coupons
        });

        console.log("coupons=",coupons)
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
        console.log("usedCouponIds=",usedCouponIds)
        const coupons = await Coupon.find({
            _id: { $nin: usedCouponIds },  // Exclude used coupons
            isActive: true,
            expiryDate: { $gt: Date.now() }  // Only active and valid coupons
        });
        // Render the coupons view, passing the user object
        res.render('users/view-coupon', { coupons, user });
    } catch (error) {
        console.error("Error fetching coupons:", error);
        res.status(500).send("Server error");
    }
};


// const getViewCoupon=async(req,res)=>{
//     try {
//         const user=await User.findById(req.session.user);
        
//         const coupons=await Coupon.find();
//         res.render('users/view-coupon',{user,coupons})
//     } catch (error) {
//         console.error('Error fetching coupons:', error);
//         res.status(500).send('Server error');
//     }
// }

// const applyCoupon = async (req, res) => {
//     const { couponCode } = req.body;
    

//     try {
//         // Find the coupon by code
//         const coupon = await Coupon.findOne({ couponCode: couponCode });

        
//         if (coupon) {
//             // Check if the coupon is active
//             if (!coupon.isActive) {
//                 return res.json({ success: false, message: 'Coupon is not active' });
//             }

//             // Check if the coupon has expired
//             if (coupon.expiryDate <= Date.now()) {
//                 return res.json({ success: false, message: 'Coupon has expired' });
//             }
//              req.session.coupon=coupon.discountValue;
//             console.log("req.session.coupon",req.session.coupon);
//             return res.json({ 
//                 success: true, 
//                 coupon: { 
//                     discountPercentage: coupon.discountValue // Use the actual discount value from the schema
//                 } 
//             });
//         } else if(coupon.usedBy.includes(req.session.user)){
//             return res.status(400).send("coupon is already use")
//         }
//         else {
//             return res.json({ success: false, message: 'Invalid coupon code' });
//         }
//     } catch (error) {
//         console.error(error);
//         res.json({ success: false, message: 'Server error' });
//     }
// };




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
            

            // Store the coupon code or discount in session
            req.session.coupon = coupon.discountValue;
            req.session.couponCode=coupon
            // Add the coupon to the user's usedCoupons array
           

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
        console.log("userId---",userId);
        const user=await User.findById(userId)
        console.log("user---",user);
        if (!user) {

            return res.redirect('/login')
          }
      
                res.render('users/wallet',{user})
    } catch (error) {
        
    }
}

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
    //profile
    viewProfile,
    loadEditProfile,
    editProfile,
    loadchangepassword,
    changepassword,
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
    paymentFailed
}
