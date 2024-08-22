const user = require("../models/userModel");

const isLogin = (req, res, next) => {
    if (req.session.admin_id) {
        user.findById(req.session.admin_id)
            .then((admin) => {
                if (admin && admin.isAdmin) {
                    next();
                } else {
                    res.redirect('/admin/login');
                }
            })
            .catch((error) => {
                console.error("Error in isLogin middleware:", error);
                res.status(500).send("Internal Server Error");
            });
    } else {
        res.redirect('/admin/login');
    }
};

const isLogout = async (req, res, next) => {
    try {
        if (req.session.admin_id) {
            res.redirect('/admin');
        } else {
            next();
        }
    } catch (error) {
        console.log("Error in isLogout middleware:", error.message);
        res.status(500).send("Internal Server Error");
    }
};

module.exports = {
    isLogin,
    isLogout
};
