const express=require("express");
const router=express();
const bodyParser=require("body-parser")
const passport = require('passport');
const auth=require('../middlewares/auth')
const Address=require("../models/addressModel");
const Coupon=require("../models/coupenModel");


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

// router.get('/reset-verify-otp', (req, res) => res.render('users/resetOtp')); // OTP Verification Page
// router.post('/reset-verify-otp', userController.verifyResetOtp);
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

//user cart
router.get('/cartList',userController.loadCartList)
router.get('/add-to-cart/:varientId',userController.addtoCart)
router.get('/deleteCartItem/:userId/:varientId',userController.deleteCart)
router.post('/updateCartQuantity/:productId', userController.updateCartQuantity)
router.post('/updateCartTotal/:userId',userController.updateCartTotal)

//user checkout-address
router.get('/checkout',userController.loadCheckout)
router.post('/buildingAddress',userController.saveBuildingAddress);
router.post('/saveAddress',userController.saveAddress);
router.get('/placeOrder', (req, res) => {
    res.send('Place Order GET request works');
});
router.post('/placeOrder',userController.placeOrder);
// router.get('/placeOrder',userController.placeOrder);
router.post('/applyCoupon',userController.applyCoupon)
//order
router.get('/order-history',userController.loadorderHistory);
router.get('/view-order/:orderId',userController.loadViewProduct);
// router.get('/reasonpage/:orderId', userController.reasonpage);
router.get('/cancel-order/:orderId/:message',userController.statusChange)
router.get('/return-order/:orderId/returned',userController.returnOrder)
router.get('/payment-failed',userController.paymentFailed);  // Show failed payment page

router.get('/retry-payment/:orderId',userController.retryPayment);  // Retry payment page

router.get('/success-page',userController.loadSuccess)
//invoice
router.get('/order/:orderId/invoice', userController.downloadInvoice);
router.get('/order/:orderId/invoice',userController.generateInvoice);
//razorpay
router.get('/payment-success',userController.paymentSuccess);


//wishList
router.get('/wishlist',userController.loadWishlist)
router.get('/add-to-wishlist/:varientId',userController.addtoWishlist)
router.get('/wishlist/:varientId',userController.deleteWishlist)
//coupon
router.get('/loadcoupon',userController.getCoupon);
router.get('/loadViewCoupon',userController.getViewCoupon)
//
router.get('/wallet',userController.loadWallet);

module.exports=router;