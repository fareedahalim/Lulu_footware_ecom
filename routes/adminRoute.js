const express = require("express");
const router = express.Router();
const nocache = require("nocache");
const auth = require("../middlewares/adminAuth");
const adminController = require("../controllers/adminController");
const customerController = require("../controllers/customerController");
const categoryController=require("../controllers/categoryController")
const orderController=require("../controllers/orderController")
const coupenController=require('../controllers/coupenController')
const offerController=require('../controllers/OfferController');
const multerMiddleware=require("../middlewares/multer").multerMiddleware
router.use(nocache());

router.get("/pageError", adminController.pageError);
router.get("/login", auth.isLogout, adminController.loadLogin);
router.post("/login", adminController.login);
router.get("/logout", adminController.logout);

//dashboard
router.get("/", auth.isLogin, adminController.loadDashboard);
router.post("/dashboard",auth.isLogin, adminController.loadDashboard)
router.get('/download-pdf',auth.isLogin,adminController.downloadPDF)
router.get('/download-excel',auth.isLogin, adminController.downloadExcel);
//user Management
router.get("/users",auth.isLogin,customerController.customerInfo)
router.get("/blockCustomer",auth.isLogin,customerController.customerBlocked)
router.get("/unblockCustomer",auth.isLogin,customerController.customerUnblocked)

//category management
// router.get("/category",auth.isLogin,categoryController.categoryInfo)
// router.post("/addCategory",auth.isLogin,categoryController.addCategory)


router.get('/main-category',auth.isLogin,categoryController.category)
router.get('/occasion',auth.isLogin,categoryController.loadOccasion)
router.get('/add-category',auth.isLogin,categoryController.addCategory)
router.post('/add-category',auth.isLogin,categoryController.addNewCategory)
router.get('/brand',auth.isLogin,categoryController.loadBrand)
router.get('/add-brand',auth.isLogin,categoryController.addBrand)
router.post('/add-brand',auth.isLogin,categoryController.addNewBrand)

router.post('/occasion/:occasionId/update-status',auth.isLogin,categoryController.updateOccasionStatus)
//edit occasion
router.get('/load-edit/:occasionId',auth.isLogin,categoryController.loadEdit)
router.post('/edit-occasion/:occasionId', auth.isLogin, categoryController.editOccasion);

//edit brand
router.post('/brand/:brandId/update-status',auth.isLogin,categoryController.updateBrandStatus)
router.get('/edit-brand/:brandId',auth.isLogin,categoryController.loadEditBrand)
router.post('/edit-brand/:brandId',auth.isLogin,categoryController.editBrand)
///product management
router.get('/products',auth.isLogin,categoryController.loadproduct)
router.get('/add-product',auth.isLogin,categoryController.loadAddProduct)
router.post('/add-product',auth.isLogin,categoryController.addNewProduct)
router.get('/edit-product/:prodectId',auth.isLogin,categoryController.loadEditProduct)
router.post('/edit-product/:productId',auth.isLogin,categoryController.editProduct)
router.post('/products/:productId/update-status',auth.isLogin,categoryController.updateProductStatus)

// router.post('/delete-variant/:variantId', auth.isLogin,categoryController.deleteVariant);



router.get('/add-varient/:productId',auth.isLogin,categoryController.loadAddVarient)
router.post('/add-varient/:productId',auth.isLogin,multerMiddleware.array('images', 3), categoryController.addVarient);
router.get('/varient/:productId',auth.isLogin,categoryController.loadVarient)
router.get('/edit-varient/:varientId',auth.isLogin,categoryController.loadEditVarient)
router.post('/edit-varient/:varientId',categoryController.editVarient)
// router.post('/updateStock/:varientId',auth.isLogin,categoryController.editStock)

//order management
router.get('/orderList',auth.isLogin,orderController.loadOrder);
router.post('/canceled-orders/:orderId',auth.isLogin, orderController.confirmOrderCancellation)
router.post('/update-status/:orderId',auth.isLogin, orderController.updateStatus)

//coupen management
router.get('/coupon',coupenController.loadCoupon)
router.get('/add-coupon',coupenController.loadAddCoupon)
router.post('/add-coupon',coupenController.addCoupon)
router.get('/edit-coupon/:couponId',coupenController.loadEditCoupon)
router.post('/update-coupon/:couponId',coupenController.editCoupon)
router.get('/coupon/:couponId',coupenController.deleteCoupon)
//offer management
router.get('/offers',offerController.listOffer);
router.get('/add-offer',offerController.loadAddOffer)
router.post('/add-offer',offerController.addOffer)
router.get('/edit-offer/:offerId',offerController.loadEditOffer)
router.post('/edit-offer/:offerId',offerController.editOffer)
router.get('/delete-offer/:offerId',offerController.deleteOffer)


module.exports = router;



