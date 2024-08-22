const Category = require("../models/categoryModel");

const category=async(req,res)=>{
    try {
        const categories=await Category.find();
        res.render('admin/category',{categories})
    } catch (error) {
        console.error("Error fetching Categories",error.message)
        res.status(500).send('Internal Server Error')
    }
}

const addCategory=async(req,res)=>{
    try {
        
    } catch (error) {
        
    }
}
module.exports={
    category,
    addCategory
}