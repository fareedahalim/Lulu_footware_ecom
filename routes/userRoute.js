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
    
    req.session.user=req.user._id;
    
    res.redirect('/')
})


router.get('/login',auth.isLogout,userController.loadLogin)
router.post('/login',userController.login)

//logout
router.get('/logout',auth.isLogout,userController.logout)

router.get('/forgot-password',userController.loadForgotPassword);
router.post('/forgot-password', userController.handleForgotPassword);


router.post('/reset-verify-otp', userController.verifyResetOtp);
router.post('/reset-resend-otp', userController.resetResendOtp);
router.get('/reset-password', userController.loadResetPassword);
router.post('/reset-password', userController.handleResetPassword);

//user profile management
router.get('/profile',auth.isLogged,userController.viewProfile)

router.get('/edit-profile/:id',auth.isLogged,userController.loadEditProfile);
router.post('/edit-profile/:id',auth.isLogged,userController.editProfile);

router.get ('/change-password',auth.isLogged,userController.loadchangepassword);
router.post('/changepass',auth.isLogged,userController.changepassword);
router.post('/validate-password',auth.isLogged,userController.validatePassword)

// user Address
router.get('/address',auth.isLogged,addressController.loadAddress)
router.get('/add-Address',auth.isLogged,addressController.loadAddAddress)
router.post('/add-Address',auth.isLogged,addressController.addAddress)
router.get('/edit-address/:addressId',addressController.loadEditAddress);
router.post('/update-address/:addressId',addressController.updateAddress);
router.get('/delete-address/:addressId',auth.isLogged,addressController.deleteAddress);

//user cart
router.get('/cartList',userController.loadCartList)
router.get('/add-to-cart/:varientId',userController.addtoCart)
router.get('/deleteCartItem/:userId/:varientId',auth.isLogged,userController.deleteCart)
router.post('/updateCartQuantity/:productId', auth.isLogged,userController.updateCartQuantity)
router.post('/updateCartTotal/:userId',auth.isLogged,userController.updateCartTotal)

//user checkout-address
router.get('/checkout',auth.isLogged,userController.loadCheckout)
router.post('/buildingAddress',auth.isLogged,userController.saveBuildingAddress);
router.post('/saveAddress',auth.isLogged,userController.saveAddress);
router.get('/placeOrder', (req, res) => {
    res.send('Place Order GET request works');
});
router.post('/placeOrder',auth.isLogged,userController.placeOrder);

router.post('/applyCoupon',auth.isLogged,userController.applyCoupon)
//order
router.get('/order-history',auth.isLogged,userController.loadorderHistory);
router.get('/view-order/:orderId',auth.isLogged,userController.loadViewProduct);

router.get('/cancel-order/:orderId/:message',auth.isLogged,userController.statusChange)
router.get('/return-order/:orderId/returned',auth.isLogged,userController.returnOrder)
router.get('/payment-failed',auth.isLogged,userController.paymentFailed);  

router.get('/retry-payment/:orderId',auth.isLogged,userController.retryPayment);  

router.get('/success-page',auth.isLogged,userController.loadSuccess)
//invoice
router.get('/order/:orderId/invoice', auth.isLogged,userController.downloadInvoice);
router.get('/order/:orderId/invoice',auth.isLogged,userController.generateInvoice);
//razorpay
router.get('/payment-success',auth.isLogged,userController.paymentSuccess);


//wishList
router.get('/wishlist',userController.loadWishlist)
router.get('/add-to-wishlist/:varientId',userController.addtoWishlist)
router.get('/wishlist/:varientId',auth.isLogged,userController.deleteWishlist)
//coupon
router.get('/loadcoupon',auth.isLogged,userController.getCoupon);
router.get('/loadViewCoupon',auth.isLogged,userController.getViewCoupon)
//wallet
router.get('/wallet',auth.isLogged,userController.loadWallet);
//review
router.post('/product-details/:varientId/submit-review',userController.submitReview);
module.exports=router;