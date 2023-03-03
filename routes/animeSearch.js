// Import packages
const express = require('express');
const axios = require('axios');
const logger = require('morgan');
const router = express.Router();
const fs = require('fs');
router.use(logger('tiny'));

// Search for anime route
router.get('/anime', (req, res) => {
    // Retrieve queries and initialise the API url
    const name = req.query['animeName']; //.replace(new RegExp(' ', 'g'), "_"); // Replace space with underscores
    const options = createJikanOptions(name, req.query['genre'])
    const url = `https://${options.hostname}${options.path}`;
    console.log(url);

    // Send a request to Jikan API
    axios.get(url)
        // Send status header to the browser
        .then((rsp) => {
            res.writeHead(rsp.status,{'content-type': 'text/html'});
            return rsp.data;
        })
        // Reply to the client
        .then((rsp) =>{
            if (rsp.data.length > 0){
                // Create the page based on the retrieved data
                const s = createResultPage(rsp.data);

                // Write the page
                res.write(s);
                res.end();
            } else {
                displayNoResultPage(res);
            }
        })
        // Handle errors if any
        .catch((error) => {
            displayErrorPage(res);
        })
});

// Properties to query from Jikan API
function createJikanOptions(query,genre) {
    const options = {
        hostname: 'api.jikan.moe/v4',
        port: 443,
        path: '/anime?',
        method: 'GET'
    }

    // Add queries to the path before hitting the API
    const str = 'q=' + query + '&sort=desc&page=' + 1;
    options.path += str;

    // Check if the genre is specified or not
    if (genre > 0)
        options.path += '&genre=' + genre;

    // Check if the anime name is specified or not
    // If not, return the top rated animes
    if (!query){
        options.path += '&order_by=members';
    }

    // Return the properties
    return options;
}

// Create result html page from the respond from the API
function createResultPage(rsp) {
    // Initialise a string to hold the result
    let result = "";

    // For each anime title
    for (let i = 0; i < rsp.length; i++){
        // Check if the entry is valid (not placeholder - API side )
        if (rsp[i].synopsis !== null && rsp[i].mal_id < 50000){ // somehow id > 50000 is repetitive and does not have enough info (API side)
            // Add to anime to the string
            result +=
            `<div class="col">
            <div class="card mb-6 h-100 p-2" style="border: 2px solid #a3a199">
                <div class="row g-0">
                <div class="col-md-4 align-self-center">
                    <img src="${rsp[i].images.jpg.image_url}" class="img-fluid rounded-start" alt="${rsp[i].title}">
                </div>
                <div class="col-md-8">
                    <div class="card-body">
                    <h5 class="card-title"><a href="/anime/${rsp[i].mal_id}" target="_blank" style="text-decoration: none">${rsp[i].title}</a></h5>
                    <p class="card-text">${rsp[i].synopsis}</p>
                    <p class="card-text "><small class="text-muted">Rated: ${rsp[i].rating}</small></p>
                    </div>
                </div>
                </div>
            </div>
            </div>`
        }
    }
    
    // Add the infomation to the html
    // Headers and opening body, then main content and close
    const str = 
    `<!doctype html>
    <html lang="en">
    <head>
        <!-- Required meta tags -->
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">

        <!-- Bootstrap CSS -->
        <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.1.1/dist/css/bootstrap.min.css" rel="stylesheet" integrity="sha384-F3w7mX95PdgyTmZZMECAngseQB83DfGTowi0iMjiWaeVhAn4FJkqJByhZMI3AhiU" crossorigin="anonymous">

        <title>Result</title>
    </head>
    <body class = "m-4 bg-image" style="background-image: url('https://wallpaper.dog/large/10848834.jpg'); ">
    <div style="margin-left: auto; margin-right: 0;background-color: rgba(255, 255, 255, 0.75); max-width: 400px" class = "p-2">
        <a href = "/" ><button type="button" class="btn" style="background-color:#b29aff;">Home</button></a>
    </div>
    <hr>
    <div class="row row-cols-1 row-cols-md-2 g-4">` +
    result +
    '</div></body></html>';

    // Return the full html string
    return str;
}

// Display page when no result is found
function displayNoResultPage(res){
    // Return status 404 
    // res.writeHead(404,{'content-type': 'text/html'});

    // Read the error page html
    fs.readFile('errors/noResult.html', 'utf8', (err, data) => {
        // If cannot read
        if (err) {
            // Display an alternative message
            res.end(`<p>No result found. <a href = "/">Click here to return to homepage<a>.</p>`);
        } else {
            // Else display the page
            res.end(data);
        }
    });
}

// Display error page
function displayErrorPage(res){
    // Read the error page html
    fs.readFile('errors/otherErrors.html', 'utf8', (err, data) => {
        // If cannot read
        if (err) {
            // Display an alternative message
            res.end(`<p>Something went wrong. <a href = "/">Click here to return to homepage<a>.</p>`);
        } else {
            // Else display the page
            res.end(data);
        }
    });
}

// Export the router
module.exports = router;

