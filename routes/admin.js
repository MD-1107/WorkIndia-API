const express=require('express');
const bodyParser=require('body-parser');
const router=express.Router();

const connection=require('../connections');

router.use(express.json()); 
router.use(bodyParser.urlencoded({ extended: false }));
router.use(bodyParser.json());

const apiKeyMiddleware = (req, res, next) => {
    const apiKey = req.headers['x-api-key'];
    //the api key is set to be admin123
      if (apiKey && apiKey === 'admin123') {
      next();
    } 
    else 
    {  
      res.status(401).json({ error: 'Unauthorized' });
    }
  };


  //adding trains in the trains table which is done by the admin and is protected by the admin api key which is set from before
 router.post('/trains/create', apiKeyMiddleware, (req, res) => 
 {
    const {train_name, source, destination, seat_capacity, arrival_time_at_source, arrival_time_at_destination } = req.body;
    console.log(req.body);
    
    connection.query('INSERT INTO trains (train_name, source, destination, seat_capacity, arrival_time_at_source, arrival_time_at_destination) VALUES (?, ?, ?, ?, ?, ?)', [train_name, source, destination, seat_capacity, arrival_time_at_source, arrival_time_at_destination], (err, results) => {
      if (err) 
      {
        console.error(err);
        res.status(500).json({ error: 'Failed to add train' });
      } else {
        res.status(200).json({ message: 'Train added successfully with id', train_name:train_name });
      }
    });
  });
  //train added successfully

  //updating the seats capacity of the train
  router.put("/trains/create/:2", apiKeyMiddleware, (req, res)=>
  {
    const id = req.params.id;
    const {seat_capacity} = req.body;
    console.log("Seat capacity to be updated of train id: ", id, seat_capacity);
    
    connection.query('UPDATE trains SET seat_capacity = ? WHERE id = ?', [seat_capacity, id], (err, results) => 
    {
      if (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to update total seats' });
      } else {
        res.status(200).json({ message: 'Total seats updated successfully' });
      }
    });
  });

  module.exports=router;