const express = require("express");
const router = express.Router();
const nocache = require("nocache");
const auth = require("../middlewares/adminAuth");
const adminController = require("../controllers/adminController");
const customerController = require("../controllers/customerController");
const categoryController=require("../controllers/categoryController")
router.use(nocache());

router.get("/pageError", adminController.pageError);
router.get("/login", auth.isLogout, adminController.loadLogin);
router.post("/login", adminController.login);
router.get("/", auth.isLogin, adminController.loadDashboard);
router.get("/logout", adminController.logout);

//user Management
router.get("/users",auth.isLogin,customerController.customerInfo)
router.get("/blockCustomer",auth.isLogin,customerController.customerBlocked)
router.get("/unblockCustomer",auth.isLogin,customerController.customerUnblocked)

//category management
// router.get("/category",auth.isLogin,categoryController.categoryInfo)
// router.post("/addCategory",auth.isLogin,categoryController.addCategory)


router.get('/category',auth.isLogin,categoryController.category)
router.post('/addCategory',auth.isLogin,categoryController.addCategory)
module.exports = router;



