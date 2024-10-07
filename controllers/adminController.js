
const User = require('../models/userModel');
const bcrypt = require("bcrypt");
const Order=require('../models/orderModel')
const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');
const ExcelJS = require('exceljs');

const pageError = async (req, res) => {
    res.render("admin/admin-error");
};

const loadLogin = (req, res) => {
    if (req.session.admin_id) {
        return res.redirect("/admin");
    }
    res.render("admin/admin-login", { errorMessage: null });
};

const login = async (req, res) => {
    try {
        const { email, password } = req.body;
        const admin = await User.findOne({ email, isAdmin: true });

        if (!admin) {
            return res.render("admin/admin-login", { errorMessage: "Email and password are incorrect" });
        }

        const passwordMatch = await bcrypt.compare(password, admin.password);
        if (!passwordMatch) {
            return res.render("admin/admin-login", { errorMessage: "Incorrect password" });
        }

        req.session.admin_id = admin._id; 
        return res.redirect("/admin");

    } catch (error) {
        console.log("Login error:", error);
        return res.redirect("/admin/pageError");
    }
};


// 
const loadDashboard = async (req, res) => {
    let totalSalesCount = 0;
    let totalOrderAmount = 0;
    let totalDiscount = 0;
    let orders = [];
    let start;
    let end;
    let topSellingProduct = null;
    let top10Products = [];
    let top10Brands = [];
   
    if (req.session.admin_id) {
        try {
            const { startDate, endDate } = req.body;

    
            if (startDate && endDate) {
                start = new Date(startDate);
                end = new Date(endDate);
                end.setUTCHours(23, 59, 59, 999);
            } else {
                const today = new Date();
                start = new Date(today);
                end = new Date(today);
                end.setUTCHours(23, 59, 59, 999);
            }

            req.session.startingDate = start;
            req.session.endDate = end;

            
            const result = await Order.aggregate([
                {
                    $match: {
                        orderDate: {
                            $gte: start,
                            $lte: end
                        }
                    }
                },
                {
                    $group: {
                        _id: null,
                        totalAmount: { $sum: "$totalAmount" },
                        totalCount: { $sum: 1 },
                        totalDiscount: { $sum: "$discountAmount" }
                    }
                }
            ]);

            orders = await Order.find({
                orderDate: {
                    $gte: start,
                    $lte: end
                }
            })
           

            totalOrderAmount = result.length > 0 ? result[0].totalAmount : 0;
            totalSalesCount = result.length > 0 ? result[0].totalCount : 0;
            totalDiscount = Math.floor(result.length > 0 ? result[0].totalDiscount : 0);

            // Best-selling product (top 1)
            const topSellingResult = await Order.aggregate([
                { $unwind: "$products" },
                {
                    $group: {
                        _id: "$products.varientId",
                        totalQuantity: { $sum: "$products.quantity" }
                    }
                },
                { $sort: { totalQuantity: -1 } },
                { $limit: 1 }, // Top 1 product
                {
                    $lookup: {
                        from: "varients",
                        localField: "_id",
                        foreignField: "_id",
                        as: "varientDetails"
                    }
                },
                { $unwind: "$varientDetails" },
                {
                    $lookup: {
                        from: "products",
                        localField: "varientDetails.productId",
                        foreignField: "_id",
                        as: "productDetails"
                    }
                },
                { $unwind: "$productDetails" }
            ]);

            if (topSellingResult.length > 0) {
                const topSelling = topSellingResult[0];
                topSellingProduct = {
                    name: topSelling.productDetails.productName,
                    image: topSelling.varientDetails.images[0],
                    quantitySold: topSelling.totalQuantity
                };
            }

            // Top 10 best-selling products
            const top10Result = await Order.aggregate([
                { $unwind: "$products" },
                {
                    $group: {
                        _id: "$products.varientId",
                        totalQuantity: { $sum: "$products.quantity" }
                    }
                },
                { $sort: { totalQuantity: -1 } },
                { $limit: 10 }, // Top 10 products
                {
                    $lookup: {
                        from: "varients",
                        localField: "_id",
                        foreignField: "_id",
                        as: "varientDetails"
                    }
                },
                { $unwind: "$varientDetails" },
                {
                    $lookup: {
                        from: "products",
                        localField: "varientDetails.productId",
                        foreignField: "_id",
                        as: "productDetails"
                    }
                },
                { $unwind: "$productDetails" }
            ]);

            top10Products = top10Result.map(product => ({
                name: product.productDetails.productName,
                image: product.varientDetails.images[0],
                quantitySold: product.totalQuantity
            }));

            // Top 10 best-selling brands
            const top10BrandsResult = await Order.aggregate([
                { $unwind: "$products" },
                {
                    $lookup: {
                        from: "varients",
                        localField: "products.varientId",
                        foreignField: "_id",
                        as: "varientDetails"
                    }
                },
                { $unwind: "$varientDetails" },
                {
                    $lookup: {
                        from: "products",
                        localField: "varientDetails.productId",
                        foreignField: "_id",
                        as: "productDetails"
                    }
                },
                { $unwind: "$productDetails" },
                {
                    $group: {
                        _id: "$productDetails.brand", // Group by brand
                        totalQuantity: { $sum: "$products.quantity" }
                    }
                },
                { $sort: { totalQuantity: -1 } },
                { $limit: 10 }, // Top 10 brands
                {
                    $lookup: {
                        from: "brands",
                        localField: "_id",
                        foreignField: "_id",
                        as: "brandDetails"
                    }
                },
                { $unwind: "$brandDetails" }
            ]);

            top10Brands = top10BrandsResult.map(brand => ({
                name: brand.brandDetails.brandName,
                quantitySold: brand.totalQuantity
            }));

            const top10OccasionsResult = await Order.aggregate([
                { $unwind: "$products" }, // Unwind the products array
                {
                    $lookup: {
                        from: "varients",
                        localField: "products.varientId",
                        foreignField: "_id",
                        as: "varientDetails"
                    }
                },
                { $unwind: "$varientDetails" }, // Unwind varient details
                {
                    $lookup: {
                        from: "products",
                        localField: "varientDetails.productId",
                        foreignField: "_id",
                        as: "productDetails"
                    }
                },
                { $unwind: "$productDetails" }, // Unwind product details
                {
                    $group: {
                        _id: "$productDetails.category", 
                        totalQuantity: { $sum: "$products.quantity" }
                    }
                },
                { $sort: { totalQuantity: -1 } },
                { $limit: 10 }, 
                {
                    $lookup: {
                        from: "occasions", 
                        localField: "_id",
                        foreignField: "_id",
                        as: "occasionDetails"
                    }
                },
                { $unwind: "$occasionDetails" } 
            ]);
            
            top10Occasions = top10OccasionsResult.map(occasion => ({
                name: occasion.occasionDetails.categoryName, 
                quantitySold: occasion.totalQuantity 
            }));
            
            // Store the values in the session
            req.session.PEorders = orders;
            req.session.totalOrderAmount = totalOrderAmount;
            req.session.totalSalesCount = totalSalesCount;
            req.session.totalDiscount = totalDiscount;

            const salesData = orders.map(order => ({
                orderDate: order.orderDate.toLocaleDateString(),
                totalAmount: order.totalAmount,
                discountAmount: order.discountAmount,
            }));
            
            const orderCounts = await getOrderCountsByPaymentMethod();
        
            res.render("admin/dashboard", {
                totalSalesCount,
                totalDiscount,
                totalOrderAmount,
                orders,
                salesData,
                topSellingProduct, 
                top10Products,     
                top10Brands , 
                top10Occasions,
                orderCounts
                  
            });

        } catch (error) {
            console.log("Error loading dashboard:", error);
            res.redirect("/admin/pageError");
        }
    } else {
        res.redirect("/admin/login");
    }
};

async function getOrderCountsByPaymentMethod() {
    const orderCounts = await Order.aggregate([
      {
        $group: {
          _id: '$payment', // Group by the 'payment' field
          count: { $sum: 1 }, // Count the number of orders for each payment method
        },
      },
    ]);
    return orderCounts;
  }


const downloadPDF = async (req, res) => {
    const orders = req.session.PEorders;
    const totalOrderAmount = req.session.totalOrderAmount;
    const totalSalesCount = req.session.totalSalesCount;
    const totalDiscount = req.session.totalDiscount;
    let startDate =  req.session.startingDate;
    let endDate= req.session.endDate;

    const PDFDocument = require('pdfkit');
    const fs = require('fs');
    const path = require('path');

    const doc = new PDFDocument();

    
    const pdfDir = path.join(__dirname, '..', 'pdfs'); 
    const filename = path.join(pdfDir, `Order_Report_${Date.now()}.pdf`);


    if (!fs.existsSync(pdfDir)) {
        fs.mkdirSync(pdfDir);
    }

    const writeStream = fs.createWriteStream(filename);
    doc.pipe(writeStream);

    
    doc.fontSize(20).text('Order Report', { align: 'center' });
    doc.moveDown();

    
    doc.fontSize(12);
    const headers = [ 'Order Date', 'Customer', 'Amount', 'Discount', 'Grand Total', 'Status'];
    const headerWidths = [90, 90, 80, 80, 80, 80];


    headers.forEach((header, index) => {
        doc.text(header, 50 + headerWidths.slice(0, index).reduce((a, b) => a + b, 0), 100);
    });

    let y = 120; 


    orders.forEach(order => {
        const grandTotal = (order.totalAmount || 0) + (order.discountAmount || 0);

        
        const orderDate = new Date(order.orderDate).toLocaleDateString();

        const rowData = [
            
            orderDate,
            order.address[0].username,
            order.totalAmount,
            order.discountAmount,
            grandTotal,
            order.status,
        ];

        rowData.forEach((data, index) => {
            doc.text(data, 50 + headerWidths.slice(0, index).reduce((a, b) => a + b, 0), y);
        });

        y += 20; 
    });
    if (y + 60 > doc.page.height - doc.page.margins.bottom) {
        doc.addPage(); 
        y = 50; 
    }
    
    doc.moveTo(50, y).lineTo(700, y).stroke();
    y += 10; 

    
    y += 20; 
    doc.text(`Starting Date: ${startDate}`, 50, y);

    y += 20; 
    doc.text(`ending Date: ${endDate}`, 50, y);
    y += 20;
    doc.fontSize(12).text(`Total Sales Count: ${totalSalesCount}`, 50, y);
    y += 20; 
    doc.text(`Total Order Amount: Rs. ${totalOrderAmount}`, 50, y);
    y += 20; 
    doc.text(`Total Discount: Rs. ${totalDiscount}`, 50, y);

    doc.end();

    
    writeStream.on('finish', function () {
        res.download(filename); 
    });
};

const downloadExcel = async (req, res) => {
    const orders = req.session.PEorders;
    const totalOrderAmount = req.session.totalOrderAmount;
    const totalSalesCount = req.session.totalSalesCount;
    const totalDiscount = req.session.totalDiscount;

    
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Order Report');

    
    worksheet.columns = [
        { header: 'Order ID', key: 'orderId', width: 20 },
        { header: 'Order Date', key: 'orderDate', width: 20 },
        { header: 'Customer', key: 'customer', width: 30 },
        { header: 'Amount (Rs.)', key: 'amount', width: 20 },
        { header: 'Discount (Rs.)', key: 'discount', width: 20 },
        { header: 'Grand Total (Rs.)', key: 'grandTotal', width: 20 },
        { header: 'Status', key: 'status', width: 20 }
    ];

    
    orders.forEach(order => {
        const orderDate = new Date(order.orderDate);  
        const grandTotal = (order.totalAmount || 0) + (order.discountAmount || 0);
        worksheet.addRow({
            orderId: order._id,
            orderDate: orderDate.toLocaleDateString(),  
            customer: order.address[0].username,
            amount: order.totalAmount,
            discount: order.discountAmount,
            grandTotal: grandTotal,
            status: order.status
        });
    });

    worksheet.addRow([]);
    worksheet.addRow(['Total Sales Count', totalSalesCount]);
    worksheet.addRow(['Total Order Amount (Rs.)', totalOrderAmount]);
    worksheet.addRow(['Total Discount (Rs.)', totalDiscount]);

    
    const filePath = path.join(__dirname, 'excel', `Order_Report_${Date.now()}.xlsx`);

    
    if (!fs.existsSync(path.join(__dirname, 'excel'))) {
        fs.mkdirSync(path.join(__dirname, 'excel'));
    }

    
    await workbook.xlsx.writeFile(filePath);

    
    res.download(filePath);
};

const logout = (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            console.log("Error destroying session:", err);
            return res.redirect("/admin/pageError"); 
        }
        res.clearCookie('connect.sid', { path: '/' }); 
        return res.redirect("/admin/login"); 
    });
};


module.exports = {
    loadLogin,
    login,
    loadDashboard,
    pageError,
    logout,
    downloadPDF,
    downloadExcel
   
};

    
