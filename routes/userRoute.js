const express=require("express");
const router=express();
const bodyParser=require("body-parser")
const passport = require('passport');
const auth=require('../middlewares/auth')


const userController=require("../controllers/userController");
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
router.get('/signup',auth.isLogout,userController.loadSignUp)
router.post('/signup',userController.continueSignup)

router.post('/verify-otp',userController.verifyOtp)
// router.post('/resend-otp', userController.resendOtp);

router.get('/auth/google',passport.authenticate('google',{scope:['profile','email']}));
router.get('/auth/google/callback',passport.authenticate('google',{failureRedirect:'/signup'}),(req,res)=>{
    res.redirect('/')
})

router.get('/login',auth.isLogout,userController.loadLogin)
router.post('/login',userController.login)

//logout
router.get('/logout',auth.isLogout,userController.logout)

router.get('/forgot-password', auth.isLogged,userController.loadForgotPassword);
router.post('/forgot-password', userController.handleForgotPassword);

router.get('/reset-verify-otp', (req, res) => res.render('users/resetOtp')); // OTP Verification Page
router.post('/reset-verify-otp', userController.verifyResetOtp);

router.get('/reset-password',auth.isLogged, userController.loadResetPassword);
router.post('/reset-password', userController.handleResetPassword);

module.exports=router;