const express=require('express');
const bodyParser=require('body-parser');

const con=require('./connections');
const adminRoutes = require('./routes/admin');
const userRoutes= require('./routes/user');

const app=express();

// app.use(bodyParser.urlencoded({ extended: false }));
// app.use(bodyParser.json());
app.use(express.json());


const PORT=3000;

app.use('/api', adminRoutes);

app.use('/api', userRoutes);




app.listen(PORT, ()=>{
    console.log("Connected to PORT 3000");
});