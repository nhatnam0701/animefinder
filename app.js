// Import packages
const express = require('express');
const fs = require('fs');
const app = express();

// Define host and port
const hostname = '127.0.0.1';
const port = 3000;

// Home page
app.get('/', (req, res) => {
    res.writeHead(200,{'content-type': 'text/html'});
    fs.readFile('public/index.html', 'utf8', (err, data) => {
        if (err) {
            res.end('Could not find or open file for reading\n');
        } else {
            res.end(data);
        }
    });
});

// Import other routes
app.use(require('./routes/animeSearch.js'));
app.use(require('./routes/animeDetails.js')); 

// 404 not found page
app.use(function(req,res){
    res.writeHead(404,{'content-type': 'text/html'});
    fs.readFile('errors/pageNotFound.html', 'utf8', (err, data) => {
        if (err) {
            res.end(`<p>Page not found. <a href = "/">Click here to return to homepage<a>.</p>`);
        } else {
            res.end(data);
        }
    });
})

// Expose the app
app.listen(port, function () {
    console.log(`Express app listening at http://${hostname}:${port}/`);
});