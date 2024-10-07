const Coupon=require("../models/coupenModel");

const loadCoupon=async(req,res)=>{
    try {
        const coupons =await Coupon.find(); 
         res.render('admin/coupon',{coupons});
    } catch (error) {
        console.log(error.message);
    }
}

const loadAddCoupon=async(req,res)=>{
    try {
        res.render('admin/add-coupon')
    } catch (error) {
        console.log(error.message)
    }
}



const addCoupon = async (req, res) => {
    try {
        const { couponCode, discountValue, expiryDate, minPurchase, maxPurchase } = req.body;
        
        

        if (!couponCode || couponCode.trim() === '') {
            return res.status(400).send('Coupon code is required.');
        }

    
        const existingCoupon = await Coupon.findOne({ couponCode });
        if (existingCoupon) {
            
            return res.render('admin/add-coupon',{errorMessage:'coupon is already existing'})
        }

        
        const newCoupon = new Coupon({
            couponCode,
            discountValue,
            expiryDate,
            minPurchase,
            maxPurchase
        });
        
        
        
        await newCoupon.save();
        return res.redirect('/admin/coupon')

    
    } catch (error) {
        console.error('Error adding coupon:', error);
        res.status(500).send('Server error');
    }
};

const loadEditCoupon=async(req,res)=>{
    try {
        const couponId=req.params.couponId;
        const coupon=await Coupon.findById(couponId);
        if (!coupon) {
            return res.status(404).send('Coupon not found');
        }
        res.render('admin/edit-coupon',{coupon})
    } catch (error) {
        console.error(message.error)
        res.status(500).send('Server error');
    }
}

const editCoupon=async(req,res)=>{
    try {
        const couponId = req.params.couponId;
        const { couponCode, discountValue, expiryDate, minPurchase, maxPurchase, isActive } = req.body;

        const updatedCoupon = await Coupon.findByIdAndUpdate(couponId, {
            couponCode,
            discountValue,
            expiryDate,
            minPurchase,
            maxPurchase,
            isActive: isActive === 'true'
        }, { new: true });
 
        if (!updatedCoupon) {
            return res.status(404).send('Coupon not found');
        }

         return res.redirect('/admin/coupon'); // Redirect to the coupon list page
    } catch (error) {
        console.error(error);
        res.status(500).send('Server error');
    }



}
const deleteCoupon=async (req,res)=>{
    try {
        await Coupon.findByIdAndDelete(req.params.couponId);
        res.redirect('/admin/coupon');
    } catch (error) {
        console.log(error.message);
    }
}

module.exports={
    loadCoupon,
    loadAddCoupon,
    addCoupon,
    loadEditCoupon,
    editCoupon,
    deleteCoupon
}