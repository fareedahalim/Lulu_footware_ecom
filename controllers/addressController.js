const Address=require("../models/addressModel");
const User = require("../models/userModel");
 
const loadAddress=async (req,res)=>{
    try {
        // res.render('users/address')
        const user=await User.findById(req.session.user);
        console.log(user,"gdfhdfhfgh")
        const addresses=await Address.find({user:user._id})

        console.log("address",addresses)
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
           console.log(req.session.user,'adress');
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

const loadEditAddress=async(req,res)=>{
  try {
    const addressId=req.params.addressId;
    const userAddress=await Address.findById(addressId)
    res.render('users/edit-address',{userAddress});
  } catch (error) {
    console.log(error.message);
        res.status(500).send('Internal Server Error');
  }
}
const updateAddress=async(req,res)=>{
    try {
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
        // Redirect to the 'address' page after deleting the address
        res.redirect('/address');
    } catch (error) {
        console.log(error.message);
    }
};
module.exports={

    loadAddress,
    loadAddAddress,
    addAddress,
    loadEditAddress,
    updateAddress,
    deleteAddress
    
}