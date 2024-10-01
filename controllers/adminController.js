// adminController.js
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

            // Set start and end date
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

            // Fetch total order stats
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
                        _id: "$productDetails.category", // Group by the category (occasion)
                        totalQuantity: { $sum: "$products.quantity" } // Sum the quantity sold for each occasion
                    }
                },
                { $sort: { totalQuantity: -1 } }, // Sort by totalQuantity in descending order
                { $limit: 10 }, // Limit to top 10 occasions
                {
                    $lookup: {
                        from: "occasions", // Assuming your occasion collection is named "occasions"
                        localField: "_id",
                        foreignField: "_id",
                        as: "occasionDetails"
                    }
                },
                { $unwind: "$occasionDetails" } // Unwind occasion details
            ]);
            
            top10Occasions = top10OccasionsResult.map(occasion => ({
                name: occasion.occasionDetails.categoryName, // Get occasion name
                quantitySold: occasion.totalQuantity // Total quantity sold for the occasion
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
            
            
            res.render("admin/dashboard", {
                totalSalesCount,
                totalDiscount,
                totalOrderAmount,
                orders,
                salesData,
                topSellingProduct,  // Pass top-selling product to the view
                top10Products,      // Pass top 10 products to the view
                top10Brands , 
                top10Occasions,
                  
            });

        } catch (error) {
            console.log("Error loading dashboard:", error);
            res.redirect("/admin/pageError");
        }
    } else {
        res.redirect("/admin/login");
    }
};

// const loadDashboard = async (req, res) => {
//     let totalSalesCount = 0;
//     let totalOrderAmount = 0;
//     let totalDiscount = 0;
//     let orders = [];
//     let start;
//     let end;
//     let topSellingProduct = null;
//     let top10Products = [];
//     let top10Brands = [];
//     const { page = 1, limit = 10 } = req.body;
//     if (req.session.admin_id) {
//         try {
//             const { startDate, endDate } = req.body;
//             const currentPage = parseInt(page, 10); // Ensure page is an integer
//     const resultsPerPage = parseInt(limit, 10);

//             // Validate and set start and end date
//             if (startDate && endDate && !isNaN(new Date(startDate)) && !isNaN(new Date(endDate))) {
//                 start = new Date(startDate);
//                 end = new Date(endDate);
//                 end.setUTCHours(23, 59, 59, 999); // Set end time to the end of the day
//             } else {
//                 // If dates are not provided or invalid, default to today's date
//                 const today = new Date();
//                 start = new Date(today);
//                 end = new Date(today);
//                 end.setUTCHours(23, 59, 59, 999);
//             }

//             // Store in session
//             req.session.startingDate = start;
//             req.session.endDate = end;

//             // Fetch total order stats
//             const result = await Order.aggregate([
//                 {
//                     $match: {
//                         orderDate: {
//                             $gte: start,
//                             $lte: end
//                         }
//                     }
//                 },
//                 {
//                     $group: {
//                         _id: null,
//                         totalAmount: { $sum: "$totalAmount" },
//                         totalCount: { $sum: 1 },
//                         totalDiscount: { $sum: "$discountAmount" }
//                     }
//                 }
//             ]);

//             // Fetch orders
//             orders = await Order.find({
//                 orderDate: {
//                     $gte: start,
//                     $lte: end
//                 }
//             })
//             .skip((currentPage - 1) * resultsPerPage)
//             .limit(resultsPerPage);

//             // Set total order values
//             totalOrderAmount = result.length > 0 ? result[0].totalAmount : 0;
//             totalSalesCount = result.length > 0 ? result[0].totalCount : 0;
//             totalDiscount = Math.floor(result.length > 0 ? result[0].totalDiscount : 0);

//             // (Top-selling products, brands, occasions logic is unchanged)
//             const topSellingResult = await Order.aggregate([
//                                 { $unwind: "$products" },
//                                 {
//                                     $group: {
//                                         _id: "$products.varientId",
//                                         totalQuantity: { $sum: "$products.quantity" }
//                                     }
//                                 },
//                                 { $sort: { totalQuantity: -1 } },
//                                 { $limit: 1 }, // Top 1 product
//                                 {
//                                     $lookup: {
//                                         from: "varients",
//                                         localField: "_id",
//                                         foreignField: "_id",
//                                         as: "varientDetails"
//                                     }
//                                 },
//                                 { $unwind: "$varientDetails" },
//                                 {
//                                     $lookup: {
//                                         from: "products",
//                                         localField: "varientDetails.productId",
//                                         foreignField: "_id",
//                                         as: "productDetails"
//                                     }
//                                 },
//                                 { $unwind: "$productDetails" }
//                             ]);
                
//                             if (topSellingResult.length > 0) {
//                                 const topSelling = topSellingResult[0];
//                                 topSellingProduct = {
//                                     name: topSelling.productDetails.productName,
//                                     image: topSelling.varientDetails.images[0],
//                                     quantitySold: topSelling.totalQuantity
//                                 };
//                             }
                
//                             // Top 10 best-selling products
//                             const top10Result = await Order.aggregate([
//                                 { $unwind: "$products" },
//                                 {
//                                     $group: {
//                                         _id: "$products.varientId",
//                                         totalQuantity: { $sum: "$products.quantity" }
//                                     }
//                                 },
//                                 { $sort: { totalQuantity: -1 } },
//                                 { $limit: 10 }, // Top 10 products
//                                 {
//                                     $lookup: {
//                                         from: "varients",
//                                         localField: "_id",
//                                         foreignField: "_id",
//                                         as: "varientDetails"
//                                     }
//                                 },
//                                 { $unwind: "$varientDetails" },
//                                 {
//                                     $lookup: {
//                                         from: "products",
//                                         localField: "varientDetails.productId",
//                                         foreignField: "_id",
//                                         as: "productDetails"
//                                     }
//                                 },
//                                 { $unwind: "$productDetails" }
//                             ]);
                
//                             top10Products = top10Result.map(product => ({
//                                 name: product.productDetails.productName,
//                                 image: product.varientDetails.images[0],
//                                 quantitySold: product.totalQuantity
//                             }));
                
//                             // Top 10 best-selling brands
//                             const top10BrandsResult = await Order.aggregate([
//                                 { $unwind: "$products" },
//                                 {
//                                     $lookup: {
//                                         from: "varients",
//                                         localField: "products.varientId",
//                                         foreignField: "_id",
//                                         as: "varientDetails"
//                                     }
//                                 },
//                                 { $unwind: "$varientDetails" },
//                                 {
//                                     $lookup: {
//                                         from: "products",
//                                         localField: "varientDetails.productId",
//                                         foreignField: "_id",
//                                         as: "productDetails"
//                                     }
//                                 },
//                                 { $unwind: "$productDetails" },
//                                 {
//                                     $group: {
//                                         _id: "$productDetails.brand", // Group by brand
//                                         totalQuantity: { $sum: "$products.quantity" }
//                                     }
//                                 },
//                                 { $sort: { totalQuantity: -1 } },
//                                 { $limit: 10 }, // Top 10 brands
//                                 {
//                                     $lookup: {
//                                         from: "brands",
//                                         localField: "_id",
//                                         foreignField: "_id",
//                                         as: "brandDetails"
//                                     }
//                                 },
//                                 { $unwind: "$brandDetails" }
//                             ]);
                
//                             top10Brands = top10BrandsResult.map(brand => ({
//                                 name: brand.brandDetails.brandName,
//                                 quantitySold: brand.totalQuantity
//                             }));
                
//                             const top10OccasionsResult = await Order.aggregate([
//                                 { $unwind: "$products" }, // Unwind the products array
//                                 {
//                                     $lookup: {
//                                         from: "varients",
//                                         localField: "products.varientId",
//                                         foreignField: "_id",
//                                         as: "varientDetails"
//                                     }
//                                 },
//                                 { $unwind: "$varientDetails" }, // Unwind varient details
//                                 {
//                                     $lookup: {
//                                         from: "products",
//                                         localField: "varientDetails.productId",
//                                         foreignField: "_id",
//                                         as: "productDetails"
//                                     }
//                                 },
//                                 { $unwind: "$productDetails" }, // Unwind product details
//                                 {
//                                     $group: {
//                                         _id: "$productDetails.category", // Group by the category (occasion)
//                                         totalQuantity: { $sum: "$products.quantity" } // Sum the quantity sold for each occasion
//                                     }
//                                 },
//                                 { $sort: { totalQuantity: -1 } }, // Sort by totalQuantity in descending order
//                                 { $limit: 10 }, // Limit to top 10 occasions
//                                 {
//                                     $lookup: {
//                                         from: "occasions", // Assuming your occasion collection is named "occasions"
//                                         localField: "_id",
//                                         foreignField: "_id",
//                                         as: "occasionDetails"
//                                     }
//                                 },
//                                 { $unwind: "$occasionDetails" } // Unwind occasion details
//                             ]);
                            
//                             top10Occasions = top10OccasionsResult.map(occasion => ({
//                                 name: occasion.occasionDetails.categoryName, // Get occasion name
//                                 quantitySold: occasion.totalQuantity // Total quantity sold for the occasion
//                             }));
                            

//             // Store in session and prepare for rendering
//             req.session.PEorders = orders;
//             req.session.totalOrderAmount = totalOrderAmount;
//             req.session.totalSalesCount = totalSalesCount;
//             req.session.totalDiscount = totalDiscount;

//             const salesData = orders.map(order => ({
//                 orderDate: order.orderDate.toLocaleDateString(),
//                 totalAmount: order.totalAmount,
//                 discountAmount: order.discountAmount,
//             }));

//             const totalOrdersCount = await Order.countDocuments({
//                 orderDate: { $gte: start, $lte: end }
//             });
//             const totalPages = Math.ceil(totalOrdersCount / resultsPerPage);

//             res.render("admin/dashboard", {
//                 totalSalesCount,
//                 totalDiscount,
//                 totalOrderAmount,
//                 orders,
//                 salesData,
//                 topSellingProduct,  // Pass top-selling product to the view
//                 top10Products,      // Pass top 10 products to the view
//                 top10Brands,
//                 top10Occasions,
//                 currentPage,
//                 totalPages,
//                 resultsPerPage,
//                 startDate: req.session.startingDate, // Pass start date to the frontend
//                 endDate: req.session.endDate            });

//         } catch (error) {
//             console.log("Error loading dashboard:", error);
//             res.redirect("/admin/pageError");
//         }
//     } else {
//         res.redirect("/admin/login");
//     }
// };


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

    // Define the path to save the file (use a global path or relative to project root)
    const pdfDir = path.join(__dirname, '..', 'pdfs'); // This points to the 'pdfs' folder outside of 'controllers'
    const filename = path.join(pdfDir, `Order_Report_${Date.now()}.pdf`);

    // Ensure the 'pdfs' directory exists, create it if it doesn't
    if (!fs.existsSync(pdfDir)) {
        fs.mkdirSync(pdfDir);
    }

    const writeStream = fs.createWriteStream(filename);
    doc.pipe(writeStream);

    // Add the PDF content here (e.g., titles, tables)
    doc.fontSize(20).text('Order Report', { align: 'center' });
    doc.moveDown();

    // Table Headers
    doc.fontSize(12);
    const headers = [ 'Order Date', 'Customer', 'Amount', 'Discount', 'Grand Total', 'Status'];
    const headerWidths = [90, 90, 80, 80, 80, 80];

    // Draw header
    headers.forEach((header, index) => {
        doc.text(header, 50 + headerWidths.slice(0, index).reduce((a, b) => a + b, 0), 100);
    });

    let y = 120; // Starting position for the table rows

    // Table rows
    orders.forEach(order => {
        const grandTotal = (order.totalAmount || 0) + (order.discountAmount || 0);

        // Ensure orderDate is a Date object
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

        y += 20; // Move down for the next row
    });
    if (y + 60 > doc.page.height - doc.page.margins.bottom) {
        doc.addPage(); // Add a new page if there's not enough space
        y = 50; // Reset the y position on the new page
    }
    // Draw a line under the table
    doc.moveTo(50, y).lineTo(700, y).stroke();
    y += 10; // Spacing after the line

    // Summary
    y += 20; // Spacing after the order amount
    doc.text(`Starting Date: ${startDate}`, 50, y);

    y += 20; // Spacing after the order amount
    doc.text(`ending Date: ${endDate}`, 50, y);
    y += 20;
    doc.fontSize(12).text(`Total Sales Count: ${totalSalesCount}`, 50, y);
    y += 20; // Spacing after the sales count
    doc.text(`Total Order Amount: Rs. ${totalOrderAmount}`, 50, y);
    y += 20; // Spacing after the order amount
    doc.text(`Total Discount: Rs. ${totalDiscount}`, 50, y);

    doc.end();

    // Download the file
    writeStream.on('finish', function () {
        res.download(filename); // This will trigger the file download
    });
};

const downloadExcel = async (req, res) => {
    const orders = req.session.PEorders;
    const totalOrderAmount = req.session.totalOrderAmount;
    const totalSalesCount = req.session.totalSalesCount;
    const totalDiscount = req.session.totalDiscount;

    // Create a new workbook and worksheet
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Order Report');

    // Add headers to the worksheet
    worksheet.columns = [
        { header: 'Order ID', key: 'orderId', width: 20 },
        { header: 'Order Date', key: 'orderDate', width: 20 },
        { header: 'Customer', key: 'customer', width: 30 },
        { header: 'Amount (Rs.)', key: 'amount', width: 20 },
        { header: 'Discount (Rs.)', key: 'discount', width: 20 },
        { header: 'Grand Total (Rs.)', key: 'grandTotal', width: 20 },
        { header: 'Status', key: 'status', width: 20 }
    ];

    // Add rows to the worksheet
    orders.forEach(order => {
        const orderDate = new Date(order.orderDate);  // Convert orderDate to a Date object
        const grandTotal = (order.totalAmount || 0) + (order.discountAmount || 0);
        worksheet.addRow({
            orderId: order._id,
            orderDate: orderDate.toLocaleDateString(),  // Now it's safe to use toLocaleDateString()
            customer: order.address[0].username,
            amount: order.totalAmount,
            discount: order.discountAmount,
            grandTotal: grandTotal,
            status: order.status
        });
    });

    // Add summary to the worksheet at the bottom
    worksheet.addRow([]);
    worksheet.addRow(['Total Sales Count', totalSalesCount]);
    worksheet.addRow(['Total Order Amount (Rs.)', totalOrderAmount]);
    worksheet.addRow(['Total Discount (Rs.)', totalDiscount]);

    // Define the path where the Excel file will be saved
    const filePath = path.join(__dirname, 'excel', `Order_Report_${Date.now()}.xlsx`);

    // Ensure the directory exists before writing
    if (!fs.existsSync(path.join(__dirname, 'excel'))) {
        fs.mkdirSync(path.join(__dirname, 'excel'));
    }

    // Write the Excel file to the specified location
    await workbook.xlsx.writeFile(filePath);

    // Download the file
    res.download(filePath);  // Use filePath here
};

const logout = (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            console.log("Error destroying session:", err);
            return res.redirect("/admin/pageError"); // Redirect to error page only on session destruction failure
        }
        res.clearCookie('connect.sid', { path: '/' }); // Clear the session cookie
        return res.redirect("/admin/login"); // Redirect to the login page after successful logout
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

    
