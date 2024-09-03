const express=require("express");
const router=express();
const bodyParser=require("body-parser")
const passport = require('passport');
const auth=require('../middlewares/auth')
const Address=require("../models/addressModel");


const userController=require("../controllers/userController");
const addressController=require("../controllers/addressController");
router.use(express.json());
router.use(express.urlencoded({ extended: true }));


// const path=require('path')

// const multer=require('multer')
// const storage =multer.diskStorage({
//     destination:function(req,file,cb){
//         cb(null,path.join(__dirname,'../public/image'))
//     },
//     filename:function(req,file,cb){
//         const name=Date.now()+'-'+file.originalname
//         cb(null,name)
//     }
// })

// const upload =multer({storage:storage});
router.get('/pageNotFound',userController.pageNotFound)

router.get('/',userController.loadHomepage)
router.get("/home",auth.isLogout,userController.loadHomepage);

router.get('/shop',auth.isLogout,userController.loadShoppingPage)

router.get('/product-details/:varientId',auth.isLogout,userController.loadProductDetails)
router.get('/signup',auth.isLogout,userController.loadSignUp)
router.post('/signup',userController.continueSignup)

router.post('/verify-otp',userController.verifyOtp)
router.post('/resend-otp', userController.resendOtp);

router.get('/auth/google',passport.authenticate('google',{scope:['profile','email']}));
router.get('/auth/google/callback',passport.authenticate('google',{failureRedirect:'/signup'}),(req,res)=>{
    
    res.redirect('/')
})
router.get('/auth/google/callback', passport.authenticate('google', { failureRedirect: '/login' }), (req, res) => {
    
    res.redirect('/dashboard'); // Redirect to the user's dashboard or another page after login
});

router.get('/login',auth.isLogout,userController.loadLogin)
router.post('/login',userController.login)

//logout
router.get('/logout',auth.isLogout,userController.logout)

router.get('/forgot-password',userController.loadForgotPassword);
router.post('/forgot-password', userController.handleForgotPassword);

router.get('/reset-verify-otp', (req, res) => res.render('users/resetOtp')); // OTP Verification Page
router.post('/reset-verify-otp', userController.verifyResetOtp);

router.get('/reset-password',auth.isLogged, userController.loadResetPassword);
router.post('/reset-password', userController.handleResetPassword);

//user profile management
router.get('/profile',userController.viewProfile)

router.get('/edit-profile/:id',userController.loadEditProfile);
router.post('/edit-profile/:id',userController.editProfile);

router.get ('/change-password',userController.loadchangepassword);
router.post('/changepass',userController.changepassword);

// user Address
router.get('/address',addressController.loadAddress)
router.get('/add-Address',addressController.loadAddAddress)
router.post('/add-Address',addressController.addAddress)
router.get('/update-address/:addressId',addressController.loadEditAddress);
router.post('/update-address/:addressId',addressController.updateAddress);
router.get('/delete-address/:addressId',addressController.deleteAddress);

module.exports=router;