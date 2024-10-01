const Brand = require("../models/brandModel");
const Occasion=require("../models/occasionModel")
const Product=require("../models/productModel")
const Varient=require("../models/varientModel")
const Order=require("../models/orderModel")
// const loadOrder = async (req, res) => {
//     try {
//       const { page = 1, limit = 6 } = req.query;
  
    
//       const orderData = await Order.find()
//         .skip((page - 1) * limit) 
//         .limit(parseInt(limit)); 
  
//       const totalOrders = await Order.countDocuments(); 
//       const totalPages = Math.ceil(totalOrders / limit); 
  
//       // Render the page with pagination
//       res.render('admin/order', {
//         orderData,
//         currentPage: parseInt(page),
//         totalPages
//       });
  
//     } catch (error) {
//       console.log("Error:", error);
//       res.status(500).send("Internal Server Error");
//     }
//   };
  
const loadOrder = async (req, res) => {
    try {
      const { page = 1, limit = 6, search = '' } = req.query;
  
      // Construct a query to search by name
      const query = search ? { "address.username": { $regex: search, $options: 'i' } } : {};
  
      // Get the orders with the search query and sort them by orderDate descending
      const orderData = await Order.find(query)
        .sort({ orderDate: -1 }) // Sort by orderDate in descending order
        .skip((page - 1) * limit)
        .limit(parseInt(limit));
  
      const totalOrders = await Order.countDocuments(query); // Count documents based on the search query
      const totalPages = Math.ceil(totalOrders / limit);
  
      // Render the page with pagination and search results
      res.render('admin/order', {
        orderData,
        currentPage: parseInt(page),
        totalPages,
        search // Pass the search query to the view
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
        
        // const varient=await Order.findById(orderById).populate('')
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

        console.log("Order status updated to:", order.status);
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