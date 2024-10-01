const Category = require("../models/occasionModel");
const Brand = require("../models/brandModel");
const Occasion=require("../models/occasionModel")
const Product=require("../models/productModel")
const Varient=require("../models/varientModel")
const path = require('path');
const fs=require("fs")
const sharp=require("sharp")
//main category
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
    
            // Validate category name
            if (categoryName === "") {
                return res.json({ success: false, message: "Please enter a category name." });
            }
    
            if (!/^[A-Za-z\s]+$/.test(categoryName)) {
                return res.json({ success: false, message: "Category name must contain alphabetic characters only. Numbers or special characters are not allowed." });
            }
    
            // Check if category name already exists
            const existsCategoryName = await Category.findOne({ categoryName: new RegExp(`^${categoryName}$`, 'i') });
            console.log(existsCategoryName)
    
            if (existsCategoryName) {
                if (existsCategoryName.isBlocked) {
                    return res.json({ success: false, message: "This category is blocked. Please choose a different name." });
                } else {
                    return res.json({ success: false, message: "This category already exists. Please choose a different name." });
                }
            }
    
            // Create new category
            const newCategory = new Category({ categoryName });
            await newCategory.save();
    
            // Send success response
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

// const addNewBrand = async (req, res) => {
//     try {
//         const { brandName } = req.body;

//         // Check if the brand name already exists
//         if(brandName===""){
//             return res.render("admin/add-brand",{message:"Brand name is required"})
//         }
//         const existBrandName = await Brand.findOne({ brandName });

//         if (existBrandName) {
//             // If the brand already exists, render the form again with an error message
//             return res.render("admin/add-brand", { message: "This Brand already exists, please choose another" });
//         }

//         // If not, proceed to create a new brand
//         const newBrand = new Brand({
//             brandName
//         });

//         const savedBrand = await newBrand.save();
//         console.log("Brand saved:", savedBrand);

//         // Redirect to the brand list or wherever appropriate
//         return res.redirect('/admin/brand');

//     } catch (error) {
//         // Check if the error is a duplicate key error
//         if (error.code === 11000) {
//             return res.render("admin/add-brand", { message: "This Brand already exists, please choose another" });
//         }

//         // Handle other errors
//         console.error('Error adding new brand:', error.message);
//         res.status(500).send('Internal Server Error');
//     }
// };
const addNewBrand = async (req, res) => {
    
        try {
            const { brandName } = req.body;
    
            // Validate category name
            if (brandName === "") {
                return res.json({ success: false, message: "Please enter a brand name." });
            }
    
            if (!/^[A-Za-z\s]+$/.test(brandName)) {
                return res.json({ success: false, message: "Brand name must contain alphabetic characters only. Numbers or special characters are not allowed." });
            }
    
            // Check if category name already exists
            const existsBrandName = await Brand.findOne({ brandName: new RegExp(`^${brandName}$`, 'i') });
            // console.log(existsCategoryName)
    
            if (existsBrandName) {
                if (existsBrandName.isBlocked) {
                    return res.json({ success: false, message: "This brand is blocked. Please choose a different name." });
                } else {
                    return res.json({ success: false, message: "This brand already exists. Please choose a different name." });
                }
            }
    
            // Create new category
            const newBrand = new Brand({ categoryName });
            await newBrand.save();
    
            // Send success response
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
//edit-occasion(rendering edit-occasion page)
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
        console.log(req.body,'body')
        const { categoryName } = req.body;
        console.log('Received Category Name:', categoryName); // Debugging line

        if (!categoryName || !/^[A-Za-z\s]+$/.test(categoryName)) {
            return res.status(400).json({ message: "Occasion name is required and must contain only alphabetic characters and spaces." });
        }

        // Check if the occasion name already exists
        const existingOccasion = await Occasion.findOne({
            categoryName: new RegExp(`^${categoryName}$`, 'i'),
            _id: { $ne: occasionId }
        });

        if (existingOccasion) {
            return res.status(400).json({ message: "This occasion name already exists. Please choose a different name." });
        }

        // Update the occasion
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
        console.log(brand)
        

    
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
        console.log(req.body,'body')
        const { brandName } = req.body;
        console.log('Received brand Name:', brandName); // Debugging line


        // Validate the brand name
        if (!brandName || !/^[A-Za-z\s]+$/.test(brandName)) {
            // return res.render('admin/edit-brand', {
            //     message: "Brand name is required and must contain only alphabetic characters and spaces.",
            //     brand: {
            //         _id: brandId,
            //         brandName
            //     }
            // });
            return res.status(400).json({message:"Barnd name is required and must contain only alphabetic charecters and spaces "})
        }

        // Check if the brand name already exists (excluding the current brand)
        const existingBrand = await Brand.findOne({
            brandName: new RegExp(`^${brandName}$`, 'i'),
            _id: { $ne: brandId }
        });

        if (existingBrand) {
            // return res.render('admin/edit-brand', {
            //     message: "This brand name already exists. Please choose a different name.",
            //     brand: {
            //         _id: brandId,
            //         brandName
            //     }
            // });
            return res.status(400).json({message:"This brand name already exists.Please choose a differend name"})
        }

        // Update the brand in the database
        const updatedBrand = await Brand.findByIdAndUpdate(
            brandId,
            { brandName: brandName },
            { new: true }
        );

        if (!updatedBrand) {
            // return res.render('admin/edit-brand', {
            //     message: "Brand not found.",
            //     brand: {
            //         _id: brandId,
            //         brandName
            //     }
            // });
            return res.status(404).json({message:"Brand not found"})
        }

    
        // res.redirect('/admin/brand');
        res.json({success:true})
    } catch (error) {
        console.error('Error updating brand:', error.message);

    
        // return res.status(500).send('Internal Server Error');
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
            // Fetch all brands and occasions from the database
            const brands = await Brand.find({blocked:false});
            const occasions = await Occasion.find({blocked:false});
            
    
            // Render the add-product page with the fetched data
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

        // Check if the product already exists
        const existingProduct = await Product.findOne({ productName: productName.trim() });

        if (existingProduct) {
            // If product exists, render the add-product page with an error message
            const brands = await Brand.find({ blocked: false });
            const occasions = await Occasion.find({ blocked: false });

            return res.render('admin/add-product', { 
                brands, 
                occasions,
                errorMessage: 'Product already exists' // Pass the error message
            });
        }

        // If product does not exist, save the new product
        const newProduct = new Product({
            productName,
            description,
            brand,
            category,
            gender
        });

        await newProduct.save();
        res.redirect('/admin/products'); // Redirect to the products page

    } catch (error) {
        console.error('Error adding new product:', error.message);
        res.status(500).send('Internal Server Error');
    }
};

const loadEditProduct=async(req,res)=>{
    try {
       const productId=req.params.prodectId;
       console.log("productId:",productId)
       const product=await Product.findById(productId).populate('brand').populate('category')
       if(!product){
        return res.status(404).send("product not found")
       }
       const brands=await Brand.find();
       const occasions=await Occasion.find();
    //    console.log("product:",product)
       res.render('admin/edit-product',{product,brands,occasions})

    } catch (error) {
        console.error('Error loading edit product page',error);
        res.redirect('/admin/product')
    }
}

const editProduct=async(req,res)=>{

    
        try {
            const productId = req.params.productId;
            console.log(productId)
            const { productName, description, brand, category, gender } = req.body;
    
            console.log('Received Product Data:', { productName, description, brand, category, gender });
    
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
        console.log(productId)

    try {
        
        const product = await Product.findById(productId);
        console.log(product)
        if (!product) {
            return res.status(404).send('Product not found');
        }

        
        product.isBlocked = !product.isBlocked;

        // Save the updated product
        await product.save();

        // Redirect back to the product list
        res.redirect('/admin/products');
    } catch (error) {
        console.error(error);
        res.status(500).send('Server Error');
    }
}

    
//Varient
const loadAddVarient=async(req,res)=>{
    try {
        console.log("loading add varient page")
        const productId=req.params.productId;
        const product=await Product.findById(productId)
        console.log(product,"product")
         res.render('admin/add-varient',{product})
    } catch (error) {
        console.error('Error in rendering the add varient pafge')
        res.status(500).send("Internal server error")
    }
}


const addVarient=async(req,res)=>{
    console.log(req.files,"jghjgjhghjg")
    try {
        const productId=req.params.productId;
        console.log(productId)
        const productExists = await Product.findById(productId);
        console.log(productExists)
        if (!productExists) {
            return res.status(404).send("Product not found");
        }

        const { stock, color, price, size } = req.body;
        let images=[];
        if(req.files&&Array.isArray(req.files)){
            images=req.files.map(file=>file.path.replace('public',''))
            }
        // const images = req.files.map(file => file.path);
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

        const variants = await Varient.find({productId:productId}); // Fetching all variants
        
        res.render('admin/varient', { variants,productId }); // Render the variant page with the data
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
            // You can pass additional data if needed
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
                    ...(images.length && { images }), // Only update images if new ones are provided
                },
                { new: true } // Return the updated variant
            );
            console.log(updatedVarient.productId,'ID')
            if (!updatedVarient) {
                return res.status(404).send('Variant not found');
            }
    
            res.redirect(`/admin/varient/${updatedVarient.productId}`);
        } catch (error) {
            console.error('Error updating variant:', error.message);
            res.status(500).send('Internal Server Error');
        }
    };
    
// const editStock=async(req,res)=>{
//     try {
//         const varientId=req.params.verientId;
//         const {stock}=req.body;
//         await Varient.findByIdAndUpdate(varientId,{stock:stock});
//         res.redirect('/varients');

//     } catch (error) {
//         console.error("Error",error)
//         res.status(500).send('Error updating stock');
//     }
// }


// Load variants for a specific product


// Delete a specific variant
const deleteVariant = async (req, res) => {
    try {
        const variantId = req.params.variantId;

        // Find the variant by its ID and delete it
        await Varient.findByIdAndDelete(variantId);

        req.flash('success', 'Variant deleted successfully');
        res.redirect('/admin/varient/' + req.body.productId); // Redirect back to the product's variants list page
    } catch (error) {
        console.error("Error deleting variant:", error.message);
        req.flash('error', 'Failed to delete variant');
        res.redirect('/admin/varient/' + req.body.productId); // Redirect back to variants page on failure
    }
};

module.exports = {
    loadVarient,
    deleteVariant,
};

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
    deleteVariant
    // editStock
    


}