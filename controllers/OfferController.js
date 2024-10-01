const Offer=require("../models/offerModel");
const Brand = require("../models/brandModel");
const Product=require("../models/productModel")
const listOffer=async(req,res)=>{
    try {
       const offers=await Offer.find().populate('entityId');
    
       res.render('admin/offers',{offers}); 
    } catch (error) {
        console.error("message".error)
        res.status(500).send("Error fetching offers");
    }
}

// const loadAddOffer=async(req,res)=>{

//     try {
//          const products=await Product.find();
//          const brands=await Brand.find();
//          res.render('admin/add-offer',{products,brands})
//     } catch (error) {
//         console.error(message.error)
//         res.status(500).send("Error fetching offers");
//     }
// }


const loadAddOffer = async (req, res) => {
    try {
        const products = await Product.find(); // Fetch all products
        const brands = await Brand.find(); // Fetch all brands
        const existingOffers = await Offer.find(); // Fetch all existing offers

        // Create sets to track existing product and brand IDs that already have offers
        const productIdsWithOffers = new Set(
            existingOffers
                .filter(offer => offer.onModel === 'Product') // Filter offers for products
                .map(offer => offer.entityId.toString())      // Extract product IDs
        );

        const brandIdsWithOffers = new Set(
            existingOffers
                .filter(offer => offer.onModel === 'Brand')   // Filter offers for brands
                .map(offer => offer.entityId.toString())      // Extract brand IDs
        );

        // Filter products and brands that do not have offers
        const filteredProducts = products.filter(product => !productIdsWithOffers.has(product._id.toString()));
        const filteredBrands = brands.filter(brand => !brandIdsWithOffers.has(brand._id.toString()));

        // Render the add-offer page with the filtered products and brands
        res.render('admin/add-offer', {
            filteredProducts,   // Only products without existing offers
            filteredBrands      // Only brands without existing offers
        });
    } catch (error) {
        console.error(error);
        res.status(500).send("Error fetching offers");
    }
};

const addOffer=async(req,res)=>{
    console.log("add offer............req.body-----------",req.body)
    const { offerType, entityId, discountPercentage, validFrom, validTo } = req.body;
    try {
        const existingEntityId= await Offer.findById(entityId)
        if(existingEntityId){
            
        }
        const newOffer = new Offer({
            offerType,
            entityId,
            onModel: offerType === 'product' ? 'Product' : 'Brand', 
            discountPercentage,
            validFrom,
            validTo
        });
        await newOffer.save();
       return res.redirect('/admin/offers');
    } catch (error) {
        
    }
}

const loadEditOffer=async(req,res)=>{
    try {
        const offerId=req.params.offerId;
        const offer=await Offer.findById(offerId).populate('entityId');
        const products=await Product.find();
        const brands=await Brand.find();
        res.render('admin/edit-offer',{offer,products,brands})
        
    } catch (error) {
        res.status(500).send("Error loading edit offer form");
    }
}

const editOffer=async(req,res)=>{
console.log("req.body-----------",req.body)
    const { offerType, entityId, discountPercentage, validFrom, validTo } = req.body;

    try {
        await Offer.findByIdAndUpdate(req.params.offerId, {
            offerType,
            entityId,
            discountPercentage,
            validFrom,
            validTo
        });
       return res.redirect('/admin/offers');
    } catch (error) {
        res.status(500).send("Error updating offer");
    }
};

const deleteOffer=async(req,res)=>{
    try {
        await Offer.findByIdAndDelete(req.params.offerId);
     return   res.redirect('/admin/offers');
    } catch (error) {
        res.status(500).send("Error deleting offer");
    }
}
module.exports={
    listOffer,
    loadAddOffer,
    addOffer,
    loadEditOffer,
    editOffer,
    deleteOffer
}