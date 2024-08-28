const User = require("../models/userModel");
const bcrypt = require("bcrypt")

const otpGenerator = require('otp-generator');
const nodemailer = require('nodemailer');
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
        
        if (user) {
            // If the user is logged in, fetch the user data from the database
            const userData = await User.findOne({ _id: user });
            
            // Pass the user data to the view
            return res.render("users/home", { user: userData });
        } else {
            // If not logged in, render the homepage without user data
            return res.render("users/home", { user: null });
        }
    } catch (error) {
        console.log("Home page error:", error);
        res.status(500).send("Server error");
    }
};

const loadShoppingPage=async(req,res)=>{
    try {
        // Check if the user is logged in by checking session
        const user = req.session.user;
        
        if (user) {
            // If the user is logged in, fetch the user data from the database
            const userData = await User.findOne({ _id: user });
            
            // Pass the user data to the view
            return res.render("users/shop", { user: userData });
        } else {
            // If not logged in, render the homepage without user data
            return res.render("users/shop", { user: null });
        }
    } catch (error) {
        console.log("Home page error:", error);
        res.status(500).send("Server error");
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



const verifyOtp = async (req, res) => {
    console.log("kgsdkfsdkufg")
    const { otp } = req.body;
    console.log(otp)
    console.log(req.session.userOtp)
    if (otp === req.session.userOtp) {
        console.log("yss")
        const user = req.session.userData

        
        console.log("yss")
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
    res.render('users/forgotPassword', { message: req.session.message });
    req.session.message = null;
};

const verifyResetOtp = async (req, res) => {
    try {
        const { otp } = req.body;

        // Compare OTP with the session OTP
        if (otp === req.session.resetOtp) {
            req.session.resetOtpVerified = true; // Set a flag for successful OTP verification
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
    if (!req.session.resetOtpVerified) {
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
// Export the functions
module.exports = {
    loadHomepage,
    loadShoppingPage,
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
    verifyResetOtp
}
