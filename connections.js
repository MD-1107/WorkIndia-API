const mysql=require('mysql2')
const conn=mysql.createConnection(
    {
        host: 'localhost',
        user:'root',
        password: 'Maanu1107%',
        database:'workindia'
    });


    conn.connect((err)=>{
        if(err)
        {
            console.log(err);
        }
        else 
        {
            console.log("Connection to the WORKINDIA database is successful");
        }
    })

    module.exports=conn;