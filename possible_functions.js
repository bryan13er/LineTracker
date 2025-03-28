const fs = require('fs');
const csv = require('csv-parser');

// Function to read a CSV file and print the column headers
function printCSVHeaders(filePath) {
  const headers = [];

  // Create a read stream for the CSV file
  fs.createReadStream(filePath)
    .pipe(csv())
    .on('headers', (headerList) => {
      // Capture the column headers
      console.log('Column Headers:', headerList);
    })
    .on('data', (row) => {
      // If needed, you can process each row here, but for now, we just care about the headers
    })
    .on('end', () => {
      console.log('CSV processing complete');
    })
    .on('error', (err) => {
      console.error('Error reading the file:', err);
    });
}

sample_data = '/Users/bryan/Desktop/Ryan Project/sample_data.csv'; // Example file path
printCSVHeaders(sample_data);
