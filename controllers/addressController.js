const Address=require("../models/addressModel");
const User = require("../models/userModel");
 
const loadAddress=async (req,res)=>{
    try {
        const user=await User.findById(req.session.user);
        
        const addresses=await Address.find({user:user._id})

    
        res.render('users/address', { addresses, user });
    } catch (error) {
        console.log(error.message);
    }
}

const loadAddAddress=async (req,res)=>{
    try {
        res.render('users/addAddress');
    } catch (error) {
        console.log(error.message); 
    }
}

const addAddress=async(req,res)=>{
    try {
        const {name,mobile,address,city,pincode,district,state}=req.body;
           
        const newAddress=new Address({
            user:req.session.user,
            address:[{
                name,
                mobile,
                address,
                city,
                pincode,
                district,
                state
            }]
        })
        await newAddress.save();
        return res.redirect('/address')
    } catch (error) {
        console.log(error.message);
    }
    }




const loadEditAddress = async (req, res) => {
  try {
   
    const user = req.session.user; // Assuming you store user ID in session
    if (!user) {
      return res.redirect('/login'); // Redirect to login if user is not logged in
    }

    const userAddress = await Address.findOne({ user: user });
    if (!userAddress) {
    
      return res.status(404).send("Address not found");
    }

    
    res.render("users/edit-address", {
      userAddress: userAddress,user
    });
  } catch (error) {
    console.log("Error fetching address:", error.message);
    res.status(500).send("Error fetching address");
  }
};



const updateAddress=async(req,res)=>{
    try {
        
        console.log("entering the updateedit address")
        const addressId=req.params.addressId;

        const {name,mobile,address,city,pincode,district,state}=req.body
        const updatedAddress={
                name,
                mobile,
                address,
                city,
                pincode,
                district,
                state
        }
       
        const result=await Address.findByIdAndUpdate(addressId,{$set:{address:[updatedAddress]}},{new:true})
        res.redirect('/address'); 
    } catch (error) {
        console.error(error.message)
    }
}
const deleteAddress=async (req,res)=>{
    try {
        await Address.findByIdAndDelete(req.params.addressId);
        
        res.redirect('/address');
    } catch (error) {
        console.log(error.message);
    }
};

const chooseAddress=async(req,res)=>{
    try {
        const userId=req.session.user;
        const addresses=await Address.find({user:userId});
        res.render('users/choose')
    } catch (error) {
        
    }
}
module.exports={

    loadAddress,
    loadAddAddress,
    addAddress,
    loadEditAddress,
    updateAddress,
    deleteAddress,
    chooseAddress
    
}