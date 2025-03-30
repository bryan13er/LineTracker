// Import the mysql2 library
const mysql = require('mysql2');

// Create a connection to the database
const connection = mysql.createConnection({
  host: 'localhost',  // Host where MySQL server is running (localhost for local setup)
  user: 'root',       // MySQL username (change it if you have a different username)
  password: '3688', // MySQL password (use your MySQL root password here)
  database: 'user_line_tracking' // Database name you created
});

// Connect to the database
connection.connect((err) => {
  if (err) {
    console.error('Error connecting to the database:', err);
    return;
  }
  console.log('Connected to the database!');
});

// Example of a query to get all users from the users table
connection.query('SELECT * FROM users', (err, results) => {
  if (err) {
    console.error('Error executing query:', err);
  } else {
    console.log('Users:', results);
  }
});

// Close the connection
connection.end();