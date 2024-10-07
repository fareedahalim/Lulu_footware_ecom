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




const loadAddOffer = async (req, res) => {
    try {
        const products = await Product.find(); 
        const brands = await Brand.find(); 
        const existingOffers = await Offer.find(); 

        
        const productIdsWithOffers = new Set(
            existingOffers
                .filter(offer => offer.onModel === 'Product') 
                .map(offer => offer.entityId.toString())      
        );

        const brandIdsWithOffers = new Set(
            existingOffers
                .filter(offer => offer.onModel === 'Brand')   
                .map(offer => offer.entityId.toString())      
        );

        
        const filteredProducts = products.filter(product => !productIdsWithOffers.has(product._id.toString()));
        const filteredBrands = brands.filter(brand => !brandIdsWithOffers.has(brand._id.toString()));

        
        res.render('admin/add-offer', {
            filteredProducts,  
            filteredBrands      
        });
    } catch (error) {
        console.error(error);
        res.status(500).send("Error fetching offers");
    }
};

const addOffer=async(req,res)=>{
    
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