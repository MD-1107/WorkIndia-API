const express=require('express');
const bodyParser=require('body-parser');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');

const connection=require('../connections');

const router=express.Router();

router.use(express.json()); 
router.use(bodyParser.urlencoded({ extended: false }));
router.use(bodyParser.json());


//authorization endpoint 
const authenticateUser = (req, res, next) => {
    const token = req.headers.authorization;
  
    // Check if the token is valid
    if (token) {
      jwt.verify(token, 'user123', (err, decoded) => {
        if (err) {
          res.status(401).json({ error: 'Invalid token' });
        } else {
          // Token is valid, proceed to the next middleware or route handler
          req.user = decoded;
          next();
        }
      });
    } else {
      // Token is missing, return unauthorized status
      res.status(401).json({ error: 'Token missing' });
    }
  };


  //registering user in the table 

  router.post("/signup", (req, res)=>
  {
    const { username, email, password } = req.body;
 // Check if the username or email is already taken
 connection.query('SELECT * FROM users WHERE username = ? OR email = ?', [username, email], async (err, results) => 
 {
   if (err) 
   {
     console.error(err);
     res.status(500).json({ error: 'Failed to register' });
   } 
   else if (results.length > 0) 
   {
     const takenFields = results.reduce((fields, user) => {
       if (user.username === username) fields.push('username');
       if (user.email === email) fields.push('email');
       return fields;
     }, []);
     res.status(400).json({ error: `The following fields are already taken: ${takenFields.join(', ')}` });
   } 
   //registration is successful
   else {
     // Hash the password
     const hashedPassword = await bcrypt.hash(password, 10);

     // Insert the user into the database
     connection.query('INSERT INTO users (username, password, email) VALUES (?, ?, ?)', [username, hashedPassword, email], (err) => {
       if (err) {
         console.error(err);
         res.status(500).json({ error: 'Failed to register' });
       } else {
         res.status(200).json({ message: "Account successfully created", status_code: 200, username: username});
       }
     });
   }
 });
});
//user registered successfully
var username="", password="", user_id="";

//logging in for the user 
router.post('/login', (req, res) => {
    username=req.body.username;
    password=req.body.password;
  
    // Check if the username exists
    connection.query('SELECT * FROM users WHERE username = ?', [username], async (err, results) => {
      if (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to login' });
      } else if (results.length === 0) {
        res.status(401).json({ error: "Incorrect username provided. Please retry", status_code: 401 });

      } else 
      {
        const user = results[0];
        const passwordMatch = await bcrypt.compare(password, user.password);
        if (passwordMatch) {
          // Generate JWT token
          const token = jwt.sign({ user_id: user.user_id, username: user.username }, 'user123');
          user_id=user.user_id;
          res.status(200).json({ message: "Login successful", status_code: 200, user_id: user.user_id, access_token: token });
        } else {
          res.status(401).json({ error: "Incorrect password provided. Please retry", status_code: 401 });
        }
      }
    });
  });


  //get seats availability 

  router.get('/trains/availability/:source/:destination', authenticateUser, (req, res)=>{
    const { source, destination } = req.params;
    connection.query('SELECT id, train_name, seat_capacity as available_seats FROM trains WHERE source = ? AND destination = ?', [source, destination], (err, results) => {
      if (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to fetch train availability' });
      } else {
        res.status(200).json({ trains: results });
      }
    });
  });


  router.post('/trains/:train_id/:user_id/book', (req, res) => {
    const { train_id, user_id } = req.params;
    const { no_of_seats} = req.body;
    // const { user_id } = user_id;
  
    // Check if the train exists
    const checkTrainSql = 'SELECT * FROM trains WHERE id = ?';
    connection.query(checkTrainSql, [train_id], (err, trainResults) => {
      if (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to book seat' });
      } else if (trainResults.length === 0) {
        res.status(404).json({ error: 'Train not found' });
      } else {
        const train = trainResults[0];
        const availableSeats = train.seat_capacity;
  
        // Check if there are enough available seats
        if (availableSeats >= no_of_seats) {
          // Start a transaction to ensure atomicity
          connection.beginTransaction((transactionErr) => {
            if (transactionErr) {
              console.error(transactionErr);
              res.status(500).json({ error: 'Failed to book seat' });
              return;
            }
  
            // Update the available seats for the train
            const updatedAvailableSeats = availableSeats - no_of_seats;
            const updateTrainSql = 'UPDATE trains SET seat_capacity = ? WHERE id = ?';
            connection.query(updateTrainSql, [updatedAvailableSeats, train_id], (updateErr) => {
              if (updateErr) {
                console.error(updateErr);
                connection.rollback(() => {
                  res.status(500).json({ error: 'Failed to book seat' });
                });
                return;
              }
  
              // Insert the booking details
              connection.query('INSERT INTO user_booking_details (train_id, user_id,  no_of_seats) VALUES (?, ?, ?)', [train_id, user_id, no_of_seats], (insertErr, insertResults) => {
                if (insertErr) {
                  console.error(insertErr);
                  connection.rollback(() => {
                    res.status(500).json({ error: 'Failed to book seat' });
                  });
                  return;
                }
  
                // Commit the transaction
                connection.commit((commitErr) => {
                  if (commitErr) {
                    console.error(commitErr);
                    connection.rollback(() => {
                      res.status(500).json({ error: 'Failed to book seat' });
                    });
                  } else {
                    res.status(200).json({
                      message: 'Seat booked successfully',
                      booking_id: insertResults.insertId,
                      seat_numbers: generateSeatNumbers(train.seatCapacity, updatedAvailableSeats + 1, updatedAvailableSeats + no_of_seats)
                    });
                  }
                });
              });
            });
          });
        } else {
          res.status(400).json({ error: 'Insufficient seats available' });
        }
      }
    });
  });
  
  // Helper function to generate seat numbers
  function generateSeatNumbers(totalSeats, startSeatNumber, endSeatNumber) {
    const seatNumbers = [];
    for (let seatNumber = startSeatNumber; seatNumber <= endSeatNumber; seatNumber++) {
      if (seatNumber > totalSeats) {
        break;
      }
      seatNumbers.push(seatNumber);
    }
    return seatNumbers;
  }
  

  router.get('/bookings/:booking_id/:user_id', authenticateUser, (req, res) => {
    const { booking_id,user_id } = req.params;
    // const user_id = req.params; // Assuming the user ID is available in req.user.id
  
    // Query the database to retrieve the booking details
    const sql = 'SELECT * FROM user_booking_details WHERE booking_id = ? AND user_id = ?';
    connection.query(sql, [booking_id, user_id], (err, results) => {
      if (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to fetch booking details' });
      } else if (results.length === 0) {
        res.status(404).json({ error: 'Booking not found' });
      } else {
        const booking = results[0];
        const response = {
          booking_id: booking.booking_id,
          train_id: booking.train_id,
          train_name: booking.train_name,
          user_id: booking.user_id,
          no_of_seats: booking.no_of_seats,
          seat_numbers: JSON.parse(booking.seat_numbers),
          arrival_time_at_source: booking.arrival_time_at_source,
          arrival_time_at_destination: booking.arrival_time_at_destination
        };
        res.status(200).json(response);
      }
    });
  });

module.exports=router;

