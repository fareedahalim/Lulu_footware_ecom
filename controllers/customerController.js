const User = require("../models/userModel");

const customerInfo = async (req, res) => {
    try {
        let search = "";
        if (req.query.search) {
            search = req.query.search;
        }

        let page = parseInt(req.query.page) || 1;
        const limit = 3;

        
        const userData = await User.find({
            isAdmin: false,
            $or: [
                { username: { $regex: ".*" + search + ".*", $options: "i" } },
                { email: { $regex: ".*" + search + ".*", $options: "i" } }
            ]
        })
            .limit(limit)
            .skip((page - 1) * limit)
            .exec();

        
        const count = await User.countDocuments({
            isAdmin: false,
            $or: [
                { username: { $regex: ".*" + search + ".*", $options: "i" } },
                { email: { $regex: ".*" + search + ".*", $options: "i" } }
            ]
        });

    
        const totalPages = Math.ceil(count / limit);

        
        res.render('admin/customers', {
            data: userData,
            totalPages: totalPages,
            currentPage: page
        });

    } catch (error) {
        console.error(error);
        res.status(500).send('Server Error');
    }
}
const customerBlocked=async(req,res)=>{
    try {
       let id= req.query.id;

       await User.updateOne({_id:id},{$set:{isBlocked:true}});
       res.redirect("/admin/users")
    
    } catch (error) {

        res.redirect("/pageError")
        
    }
};
const customerUnblocked=async(req,res)=>{
    try {
        let id=req.query.id;
        await User.updateOne({_id:id},{$set:{isBlocked:false}})
        res.redirect("/admin/users")
    } catch (error) {
        res.redirect("/pageError")
        
    }
}

module.exports = {
    customerInfo,
    customerBlocked,
    customerUnblocked,
    
};
