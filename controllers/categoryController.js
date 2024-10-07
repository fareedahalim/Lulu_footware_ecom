const Category = require("../models/occasionModel");
const Brand = require("../models/brandModel");
const Occasion=require("../models/occasionModel")
const Product=require("../models/productModel")
const Varient=require("../models/varientModel")
const path = require('path');
const fs=require("fs")
const sharp=require("sharp")

const category=async(req,res)=>{
    try {
        
        res.render('admin/main-category')
        
    } catch (error) {
        console.error("Error fetching Categories",error.message)
        res.status(500).send('Internal Server Error')
    }
}
//occation
const loadOccasion=async(req,res)=>{
    try {
        const occasions=await Occasion.find();

        res.render("admin/occasion",{occasions})
    } catch (error) {
        console.error("Error fetching occasion page")
        res.status(500).send("Internal server Error")
    }
}

const addCategory=async(req,res)=>{
        try {
            res.render("admin/add-category")
        } catch (error) {
            console.log("Error rendering add category page",error.message)
            res.status(500).send("Internal Server Error")
            
        }
    }
    
    
    const addNewCategory = async (req, res) => {
        try {
            const { categoryName } = req.body;
    
            
            if (categoryName === "") {
                return res.json({ success: false, message: "Please enter a category name." });
            }
    
            if (!/^[A-Za-z\s]+$/.test(categoryName)) {
                return res.json({ success: false, message: "Category name must contain alphabetic characters only. Numbers or special characters are not allowed." });
            }
    
            
            const existsCategoryName = await Category.findOne({ categoryName: new RegExp(`^${categoryName}$`, 'i') });
            
    
            if (existsCategoryName) {
                if (existsCategoryName.isBlocked) {
                    return res.json({ success: false, message: "This category is blocked. Please choose a different name." });
                } else {
                    return res.json({ success: false, message: "This category already exists. Please choose a different name." });
                }
            }
    
        
            const newCategory = new Category({ categoryName });
            await newCategory.save();
    
            
            return res.json({ success: true, message: "Category added successfully." });
            
        } catch (error) {
            console.error('Error adding new category:', error.message);
            return res.status(500).json({ success: false, message: 'Internal Server Error' });
        }
    };
    
    
//brand
const loadBrand=async(req,res)=>{
    try {
        const brands=await Brand.find()
        res.render('admin/brand',{brands})
    } catch (error) {
        console.error("error fetching brand page")
        res.status(500).send("Internal server Error")
    }
}

const addBrand=async (req,res)=>{
    try {
        res.render('admin/add-brand');
    } catch (error) {
        console.log("Error rendering add brand page",error.message)
        res.status(500).send("Internal Server Error")
        
    }
}


const addNewBrand = async (req, res) => {
    
        try {
            const { brandName } = req.body;
    
            
            if (brandName === "") {
                return res.json({ success: false, message: "Please enter a brand name." });
            }
    
            if (!/^[A-Za-z\s]+$/.test(brandName)) {
                return res.json({ success: false, message: "Brand name must contain alphabetic characters only. Numbers or special characters are not allowed." });
            }
    
            
            const existsBrandName = await Brand.findOne({ brandName: new RegExp(`^${brandName}$`, 'i') });
        
    
            if (existsBrandName) {
                if (existsBrandName.isBlocked) {
                    return res.json({ success: false, message: "This brand is blocked. Please choose a different name." });
                } else {
                    return res.json({ success: false, message: "This brand already exists. Please choose a different name." });
                }
            }
    
            
            const newBrand = new Brand({ categoryName });
            await newBrand.save();
    
            
            return res.json({ success: true, message: "Brand added successfully." });
            
        } catch (error) {
            console.error('Error adding new category:', error.message);
            return res.status(500).json({ success: false, message: 'Internal Server Error' });
        }
    };
    

//update-occasion
const updateOccasionStatus = async (req, res) => {
    try {
        const occasionId = req.params.occasionId;
        const occasion = await Occasion.findById(occasionId);

        if (!occasion) {
            return res.status(404).json({ error: "Occasion not found" });
        }

        const newStatus = !occasion.blocked;
        await Occasion.findByIdAndUpdate(occasionId, { $set: { blocked: newStatus } });

        return res.redirect('/admin/occasion');
    } catch (error) {
        console.error('Error updating occasion status:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
};

const loadEdit=async(req,res)=>{

    try {
        
        const occasionId=req.params.occasionId;
        const occasion=await Occasion.findById(occasionId);
        res.render('admin/edit-occasion',{occasion});
    } catch (error) {
        console.error('Error loading edit category page:', error.message);
        res.status(500).send('Internal Server Error');
    }
       

}
//edit-occasion
const editOccasion = async (req, res) => {
    try {
        const occasionId = req.params.occasionId;
        
        const { categoryName } = req.body;
        

        if (!categoryName || !/^[A-Za-z\s]+$/.test(categoryName)) {
            return res.status(400).json({ message: "Occasion name is required and must contain only alphabetic characters and spaces." });
        }

        
        const existingOccasion = await Occasion.findOne({
            categoryName: new RegExp(`^${categoryName}$`, 'i'),
            _id: { $ne: occasionId }
        });

        if (existingOccasion) {
            return res.status(400).json({ message: "This occasion name already exists. Please choose a different name." });
        }

    
        const updatedOccasion = await Occasion.findByIdAndUpdate(
            occasionId,
            { categoryName: categoryName },
            { new: true }
        );

        if (!updatedOccasion) {
            return res.status(404).json({ message: "Occasion not found." });
        }

        // Success response
        res.json({ success: true });
    } catch (error) {
        console.error('Error updating occasion:', error.message);
        res.status(500).json({ message: 'Internal Server Error' });
    }
};



const updateBrandStatus=async(req,res)=>{
    try {
        const brandId=req.params.brandId;
        const brand=await Brand.findById(brandId)
        if(!brandId){
            return res.status(404).json({error:"Brand not found"})
        }
        const newStatus=!brand.blocked;
        await Brand.findByIdAndUpdate(brandId,{$set:{blocked:newStatus}})
        return res.redirect('/admin/brand')
    }  catch (error) {
        console.error('Error updating occasion status:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
   
}
//rendering brand edit page
const loadEditBrand=async (req,res)=>{
    try {
        const brandId = req.params.brandId;

        
        const brand = await Brand.findById(brandId);
    
        

    
        res.render('admin/edit-brand', { brand });
    } catch (error) {
        console.error('Error loading edit brand page:', error);
        res.redirect('/admin/brand');
    }
}

//edit-brand
const editBrand = async (req, res) => {
    try {
        const brandId = req.params.brandId;
        
        const { brandName } = req.body;
        


        
        if (!brandName || !/^[A-Za-z\s]+$/.test(brandName)) {
           
            return res.status(400).json({message:"Barnd name is required and must contain only alphabetic charecters and spaces "})
        }

        
        const existingBrand = await Brand.findOne({
            brandName: new RegExp(`^${brandName}$`, 'i'),
            _id: { $ne: brandId }
        });

        if (existingBrand) {
           
            return res.status(400).json({message:"This brand name already exists.Please choose a differend name"})
        }

        
        const updatedBrand = await Brand.findByIdAndUpdate(
            brandId,
            { brandName: brandName },
            { new: true }
        );

        if (!updatedBrand) {
            
            return res.status(404).json({message:"Brand not found"})
        }

    

        res.json({success:true})
    } catch (error) {
        console.error('Error updating brand:', error.message);

    
        
        res.status(500).json({message:'Internal Server Error'})
    }
};
////product-management
const loadproduct=async(req,res)=>{
    try{
        const searchQuery=req.query.search || "";
        const page=parseInt(req.query.page)||1;
        const limit=5;
        const skip=(page-1)*limit;
        const searchCondition = [
            { productName: new RegExp(searchQuery, 'i') } 
          ];
      
        
          const products = await Product.find({
            $or: searchCondition, 
          })
          .populate('brand')
          .populate('category')
          .skip(skip)
          .limit(limit)
          .exec();
    
        const totalProducts=await Product.countDocuments({
            $or:searchCondition
        })
        const totalPages=Math.ceil(totalProducts/limit);
        res.render('admin/products',{products,searchQuery,currentPage:page,totalPages})

    }
    catch(error){
        console.error("error fetching brand page")
        res.status(500),send("Internal Server Error")
    }
}
const loadAddProduct=async(req,res)=>{
    
        try {
            
            const brands = await Brand.find({blocked:false});
            const occasions = await Occasion.find({blocked:false});
            
    
            
            res.render('admin/add-product', { 
                brands, 
                occasions 
            });
        } catch (error) {
            console.error('Error loading add product page:', error.message);
            res.status(500).send('Internal Server Error');
        }
    
}

const addNewProduct = async (req, res) => {
    try {
        const { productName, description, brand, category, gender } = req.body;

        
        const existingProduct = await Product.findOne({ productName: productName.trim() });

        if (existingProduct) {
            
            const brands = await Brand.find({ blocked: false });
            const occasions = await Occasion.find({ blocked: false });

            return res.render('admin/add-product', { 
                brands, 
                occasions,
                errorMessage: 'Product already exists' 
            });
        }

        
        const newProduct = new Product({
            productName,
            description,
            brand,
            category,
            gender
        });

        await newProduct.save();
        res.redirect('/admin/products'); 

    } catch (error) {
        console.error('Error adding new product:', error.message);
        res.status(500).send('Internal Server Error');
    }
};

const loadEditProduct=async(req,res)=>{
    try {
       const productId=req.params.prodectId;
       
       const product=await Product.findById(productId).populate('brand').populate('category')
       if(!product){
        return res.status(404).send("product not found")
       }
       const brands=await Brand.find();
       const occasions=await Occasion.find();
    
       res.render('admin/edit-product',{product,brands,occasions})

    } catch (error) {
        console.error('Error loading edit product page',error);
        res.redirect('/admin/product')
    }
}

const editProduct=async(req,res)=>{

    
        try {
            const productId = req.params.productId;
            
            const { productName, description, brand, category, gender } = req.body;
    
            
    
            // Validate the product name
            if (!productName || !/^[A-Za-z\s]+$/.test(productName)) {
                return res.status(400).json({ message: "Product name is required and must contain only alphabetic characters and spaces." });
            }
    
            // Check if the product name already exists (excluding the current product)
            const existingProduct = await Product.findOne({
                productName: new RegExp(`^${productName}$`, 'i'),
                _id: { $ne: productId }
            });
    
            if (existingProduct) {
                return res.status(400).json({ message: "This product name already exists. Please choose a different name." });
            }
    
            // Update the product in the database
            const updatedProduct = await Product.findByIdAndUpdate(
                productId,
                { productName, description, brand, category, gender },
                { new: true }
            );
    
            if (!updatedProduct) {
                return res.status(404).json({ message: "Product not found." });
            }
    
            res.json({ success: true });
        } catch (error) {
            console.error('Error updating product:', error.message);
            res.status(500).json({ message: 'Internal Server Error' });
        }
    };
    
 const updateProductStatus=async(req,res)=>{
        const productId = req.params.productId;
        

    try {
        
        const product = await Product.findById(productId);
        
        if (!product) {
            return res.status(404).send('Product not found');
        }

        
        product.isBlocked = !product.isBlocked;

    
        await product.save();

        
        res.redirect('/admin/products');
    } catch (error) {
        console.error(error);
        res.status(500).send('Server Error');
    }
}

    
//Varient
const loadAddVarient=async(req,res)=>{
    try {
        
        const productId=req.params.productId;
        const product=await Product.findById(productId)
        
         res.render('admin/add-varient',{product})
    } catch (error) {
        console.error('Error in rendering the add varient pafge')
        res.status(500).send("Internal server error")
    }
}


const addVarient=async(req,res)=>{

    try {
        const productId=req.params.productId;
        
        const productExists = await Product.findById(productId);
        
        if (!productExists) {
            return res.status(404).send("Product not found");
        }

        const { stock, color, price, size } = req.body;
        let images=[];
        if(req.files&&Array.isArray(req.files)){
            images=req.files.map(file=>file.path.replace('public',''))
            }

        const newVarient = new Varient({
            productId,
            stock,
            color,
            price,
            size,
            images
        });
        await newVarient.save();
        res.redirect(`/admin/varient/${productId}`)

    } catch (error) {
        console.error('Error adding variant:', error.message);
        res.status(500).send("Internal Server Error");
    }
}

const loadVarient = async (req, res) => {
    try {
        const productId=req.params.productId;

        const variants = await Varient.find({productId:productId}); 
        
        res.render('admin/varient', { variants,productId }); 
    } catch (error) {
        console.error('Error rendering variant page:', error.message);
        res.status(500).send("Internal Server Error");
    }
};
const loadEditVarient=async(req,res)=>{

    try {
        const varientId = req.params.varientId;
        const varient = await Varient.findById(varientId);

        if (!varient) {
            return res.status(404).send('Variant not found');
        }

        res.render('admin/edit-varient', {
            varient: varient,
            
        });
    } catch (error) {
        console.error('Error fetching variant:', error);
        res.status(500).send('Internal Server Error');
    }
}
const editVarient=async(req,res)=>{
           
        try {
            const varientId = req.params.varientId;
           
            const { stock, color, price, size } = req.body;
            let images = [];
    
            if (req.files && Array.isArray(req.files)) {
                images = req.files.map(file => file.path.replace('public', ''));
            }
    
            const updatedVarient = await Varient.findByIdAndUpdate(
                varientId,
                {
                    stock,
                    color,
                    price,
                    size,
                    ...(images.length && { images }), 
                },
                { new: true } 
            );
        
            if (!updatedVarient) {
                return res.status(404).send('Variant not found');
            }
    
            res.redirect(`/admin/varient/${updatedVarient.productId}`);
        } catch (error) {
            console.error('Error updating variant:', error.message);
            res.status(500).send('Internal Server Error');
        }
    };
    

// const deleteVariant = async (req, res) => {
//     try {
//         const variantId = req.params.variantId;

//         // Find the variant by its ID and delete it
//         await Varient.findByIdAndDelete(variantId);

//         req.flash('success', 'Variant deleted successfully');
//         res.redirect('/admin/varient/' + req.body.productId); // Redirect back to the product's variants list page
//     } catch (error) {
//         console.error("Error deleting variant:", error.message);
//         req.flash('error', 'Failed to delete variant');
//         res.redirect('/admin/varient/' + req.body.productId); // Redirect back to variants page on failure
//     }
// };


    module.exports={
    category,
    loadOccasion,
    addCategory,
    addNewCategory,
    loadBrand,
    addBrand,
    addNewBrand,
    updateOccasionStatus,
    loadEdit,
    editOccasion,
    updateBrandStatus,
    loadEditBrand,
    editBrand,
    loadproduct,
    loadAddProduct,
    addNewProduct,
    loadEditProduct,
    editProduct,
    loadAddVarient,
    addVarient,
    loadVarient,
    updateProductStatus,
    loadEditVarient,
    editVarient,
    
    
    


}