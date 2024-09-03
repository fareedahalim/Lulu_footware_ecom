const User = require("../models/userModel");
const bcrypt = require("bcrypt")
const Product = require('../models/productModel'); // Adjust the path as necessary
const Varient = require('../models/varientModel');

const otpGenerator = require('otp-generator');
const nodemailer = require('nodemailer');
const { ProfilingLevel } = require("mongodb");
require("dotenv").config();


//page not found
const pageNotFound = async (req, res) => {
    try {

        res.render("page-404")
    } catch (error) {
        res.redirect("/pageNotFound")
    }
}

//load home page
const loadHomepage = async (req, res) => {
    try {
        // Check if the user is logged in by checking session
        const user = req.session.user;
        
        
         
         if(user){
            const userDetails=await User.findById({_id:user})
            // console.log(userDetails.username)
        if(userDetails.isBlocked===true)
        {
            req.session.destroy((err)=>{
                if(err){
                    console.log("Session destruction error",err.message)
                    return res.redirect("/pageNotFound");
                }
                return res.redirect("/login")
            })
        }
    }
        let userData = null;

        if (user) {
            // If the user is logged in, fetch the user data from the database
            userData = await User.findOne({ _id: user });
        }


        // Fetch all products and populate the brand and category fields
        const products = await Product.find().populate('brand').populate('category');

        // For each product, fetch its variants
        const productsWithVariants = await Promise.all(products.map(async product => {
            const variants = await Varient.find({ productId: product._id });
            return {
                ...product.toObject(),
                variants
            };
        }));

        // Render the home page with the fetched products, their variants, and user data
       return res.render('users/home', { user: userData, products: productsWithVariants });

    } catch (error) {
        console.log('Error loading home page:', error.message);
        res.status(500).send('Internal Server Error');
    }
};

const loadShoppingPage=async(req,res)=>{
    try {
        // Check if the user is logged in by checking session
        const user = req.session.user;
        let userData = null;

        if (user) {
            // If the user is logged in, fetch the user data from the database
            userData = await User.findOne({ _id: user });
        }

        // Fetch all products and populate the brand and category fields
        const products = await Product.find().populate('brand').populate('category');

        // For each product, fetch its variants
        const productsWithVariants = await Promise.all(products.map(async product => {
            const variants = await Varient.find({ productId: product._id });
            return {
                ...product.toObject(),
                variants
            };
        }));
        
        // Render the home page with the fetched products, their variants, and user data
       return res.render('users/shop', { user: userData, products: productsWithVariants });

    } catch (error) {
        console.log('Error loading home page:', error.message);
        res.status(500).send('Internal Server Error');
    }
};

const loadProductDetails = async (req, res) => {
    try {
        const user = req.session.user;
        let userData = null;

        // Get productId and variantId from request parameters or query
        const  varientId = req.params.varientId;
        console.log("varientId:",varientId)
        
        console.log(user)
        if (user) {
            userData = await User.findById(user);
            if (!userData) {
                return res.status(404).send('User not found');
            }
        }
        // if (!user) {
        //     return res.status(404).send('User not logged');
        // }
        const varient = await Varient.findById(varientId);

        console.log(varient)
        const product = await Product.findById(varient.productId).populate('brand category');
        if (!product) {
            return res.status(404).send('Product not found');
        }
        console.log(product)

       
        return res.render('users/singleProduct', { user: userData, product, varient });

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




// const continueSignup = async (req, res) => {
//     try {
//         const { username, email, mobile, password, confirmPassword } = req.body;

//         // Validate the form fields
//         if (password !== confirmPassword) {
//             return res.render("users/signUp", { message: "Passwords do not match" });
//         }

//         // Check if the user already exists
//         const userExists = await User.findOne({ email });
//         if (userExists) {
//             return res.render("users/signUp", { message: "User already exists" });
//         }

//         // Check if the mobile number already exists
//         const mobileExists = await User.findOne({ mobile });
//         if (mobileExists) {
//             return res.render("users/signUp", { message: "Mobile number already exists. Please check and try again." });
//         }

//         // Generate OTP
//         const generatedOtp = generateNumericOtp(6);

//         // Send OTP via email
//         const transporter = nodemailer.createTransport({
//             service: 'Gmail',
//             auth: {
//                 user: process.env.EMAIL_USER,
//                 pass: process.env.EMAIL_PASS,
//             },
//         });

//         const mailOptions = {
//             from: process.env.EMAIL_USER,
//             to: email,
//             subject: 'OTP Verification',
//             text: `Your OTP for Lulu Footwear signup is ${generatedOtp}`,
//         };

//         transporter.sendMail(mailOptions, (error, info) => {
//             if (error) {
//                 console.log(error);
//                 return res.render("users/signUp", { message: "Failed to send OTP email. Please try again." });
//             }
//             console.log('Email sent: ' + info.response);
//         });

//         // Store the OTP and user data in the session
//         req.session.userOtp = generatedOtp;
//         req.session.userData = { username, email, mobile, password };

//         // Render the OTP verification page
//         console.log("before")


//         console.log("OTP sent:", generatedOtp);
//         res.render("users/otp");
//     } catch (error) {
//         console.error("Error during signup:", error);
//         res.status(500).send('Internal server error');
//     }
// };

const continueSignup = async (req, res) => {
    try {
        const { username, email, mobile, password, confirmPassword } = req.body;

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
        req.session.userData = { username, email, mobile, password };
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

        
        req.session.otpExpireTime = Date.now() + 1 * 60 * 1000; // OTP valid for 5 minutes

        
        console.log("OTP sent:", generatedOtp);
        console.log(email)
        res.render("users/otp", { user: email, otpSent: true });
    } catch (error) {
        console.error("Error during signup:", error);
        res.status(500).send('Internal server error');
    }
}

const verifyOtp = async (req, res) => {
    console.log("kgsdkfsdkufg")
    const { otp } = req.body;
    console.log(otp)
    console.log(req.session.userOtp)
    if (otp === req.session.userOtp) {
        
        const user = req.session.userData

    
        const saveUserData = new User({
            username: user.username,
            email: user.email,
            mobile: user.mobile,
            password: user.password
        })
        console.log(saveUserData)
        await saveUserData.save();

        req.session.user = saveUserData._id;
        //   res.json({success:true,redirect:"users/login"})}
        res.redirect("/login")
    }
    else {
        res.render("users/otp", { errorMessage: "invalid otp,please try again" })
    
    }
    
}
// }
//load loginpage
const loadLogin = async (req, res) => {
    try {
        if(!req.session.user)
        {
        return res.render("users/login");
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
        const { otp } = req.body;
        console.log(otp)
        console.log(req.session.resetOtp)
        // Compare OTP with the session OTP
        if (otp === req.session.resetOtp) {
            // req.session.resetOtpVerified = true; // Set a flag for successful OTP verification
            return res.redirect('/reset-password'); // Redirect to reset password page
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
        req.session.resetOtp = generatedOtp;
        req.session.resetEmail = email;
        
        res.redirect('/reset-verify-otp'); // Redirect to OTP verification page
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
    viewProfile,
    loadEditProfile,
    editProfile,
    loadchangepassword,
    changepassword
}
