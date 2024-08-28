require("dotenv").config();
const express = require("express");
const app = express();
const session=require("express-session")
const mongoose = require("mongoose");

const passport=require("./config/passport")
mongoose.connect('mongodb://127.0.0.1:27017/Lulu_footwear')
   


const port = process.env.SERVER_PORT || 3001;



app.set('view engine', 'ejs');
app.set('views', 'views'); // Specify the views directory if needed

app.use(express.urlencoded({ extended: true }));
app.use(express.json());

app.use(session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: true, // Corrected spelling from `saveUnitialized` to `saveUninitialized`
    cookie: {
        secure: false, // Set to true if you're using HTTPS
        httpOnly: true,
        maxAge: 72 * 60 * 60 * 1000 // 72 hours
    }
}));


app.use(passport.initialize());
app.use(passport.session())

app.use((req,res,next)=>{
    res.set('cache-control','no-store')
    next();
});

// Serve static files (like CSS)
app.use(express.static('public'));

// Import routes
const userRoute = require('./routes/userRoute');
const adminRoute=require('./routes/adminRoute')
app.use('/', userRoute); // This should correctly use the routes
app.use('/admin',adminRoute)

app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});
