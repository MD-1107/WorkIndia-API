const express=require('express');
const bodyParser=require('body-parser');

const router=express.Router();

const con=require('../connections');

router.get('/',  (req,res)=>{
    con.query("show tables;",(err,result)=>{
        if(err){
            throw err;
        }else{
            // const rows = [];
            // result.forEach((row) => {
            // //   if (row.id == 1) {
            //     // Perform any desired operations with the data
            //     console.log(`ID: ${row.id}, Name: ${row.name}`);
            //     rows.push(row);
            // //   }
            // });
            res.send(result);
        }
    });
});

module.exports=router;