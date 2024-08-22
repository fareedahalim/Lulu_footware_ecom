// adminController.js
const User = require('../models/userModel');
const bcrypt = require("bcrypt");

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

        req.session.admin_id = admin._id; // Store admin ID in session
        return res.redirect("/admin");

    } catch (error) {
        console.log("Login error:", error);
        return res.redirect("/admin/pageError");
    }
};

const loadDashboard = async (req, res) => {
    if (req.session.admin_id) {
        try {
            res.render("admin/dashboard");
        } catch (error) {
            console.log("Error loading dashboard:", error);
            res.redirect("/admin/pageError");
        }
    } else {
        res.redirect("/admin/login");
    }
};

// const logout = (req, res) => {
//     req.session.destroy((err) => {
//         if (err) {
//             console.log("Error destroying session:", err);
//             return res.redirect("/admin/pageError");
//         }
//         res.clearCookie('connect.sid', { path: '/' });
//         return res.redirect("/admin/login");
//     });
// };
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
    logout
};

    
