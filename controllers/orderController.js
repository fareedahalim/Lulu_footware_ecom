const Brand = require("../models/brandModel");
const Occasion=require("../models/occasionModel")
const Product=require("../models/productModel")
const Varient=require("../models/varientModel")
const Order=require("../models/orderModel")

  
const loadOrder = async (req, res) => {
    try {
      const { page = 1, limit = 6, search = '' } = req.query;
  
      
      const query = search ? { "address.username": { $regex: search, $options: 'i' } } : {};
  
      
      const orderData = await Order.find(query)
        .sort({ orderDate: -1 }) 
        .skip((page - 1) * limit)
        .limit(parseInt(limit));
  
      const totalOrders = await Order.countDocuments(query);
      const totalPages = Math.ceil(totalOrders / limit);
  
      
      res.render('admin/order', {
        orderData,
        currentPage: parseInt(page),
        totalPages,
        search 
      });
    } catch (error) {
      console.log("Error:", error);
      res.status(500).send("Internal Server Error");
    }
  };
  
const confirmOrderCancellation=async (req,res)=>{
    try {
        const orderId=req.params.orderId;
        const order=await Order.findById(orderId)
        if(order.status!=='cancelled'){
            order.forEach(async(orderItem)=>{
                const product=orderItem.product;
                const quantity=orderItem.quantity;
                order.stock+=quantity;
                await order.save();
            })
            order.status = 'Cancelled';

      await order.save();
        }
        res.redirect('/canceled-orders')
    } catch (error) {
        console.error("error",error)
    }
}


const updateStatus = async (req, res) => {
    try {
        
        
        const orderId = req.params.orderId;
        const order = await Order.findById(orderId);


        if (!order) {
            return res.status(404).send('Order not found');
        }

        
        const { newStatus } = req.body;

        
        if (newStatus === 'cancelled') {
            order.status = 'Cancelled';
            
        } else if (newStatus === 'shipped') {
            order.status = 'Shipped';
            
        } else if (newStatus === 'delivered') {
            order.status = 'Delivered';

        } else {
            return res.status(400).send('Invalid status update');
        }

        await order.save();

        
        return res.redirect('/admin/orderList');
    } catch (error) {
        console.error('Error updating order status:', error);
        return res.status(500).send('Internal Server Error');
    }
};
                         
                                                              
module.exports={
    loadOrder,
    confirmOrderCancellation,
    updateStatus
}