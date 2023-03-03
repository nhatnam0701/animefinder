// Import packages
const express = require('express');
const axios = require('axios');
const logger = require('morgan');
const xml2js = require('xml2js');
const fs = require('fs');
const router = express.Router();
router.use(logger('tiny'));

// Display anime details route
router.get('/anime/:id', async (req, res) => {
    // Retrieve queries and initialise Jikan API url
    const jikanOptions = createJikanOptions(req.params.id)
    const url = `https://${jikanOptions.hostname}${jikanOptions.path}`;
    const recurl = url + '/recommendations';
    
    // Send 2 requests to Jikan API and save the results for later retrieval
    const info = await axios.all([
            axios.get(url),
            axios.get(recurl),
        ])
        // Store the responses into an array
        .then(axios.spread((...rsp) => {
            return [rsp[0].data.data, rsp[1].data.data];
        }))
        // Handle errors if any
        .catch((error) => {
            // Display error page
            displayErrorPage(res);
        });
    
    // Retrieve queries and initialise Safebooru API url
    const title = info[0].title.replace(new RegExp(' ', 'g'), "_"); // replace spaces in the title with underscores
    const numOfArts = 24; // number of fanarts will be retrieved
    const safebooruOptions = createSafebooruOptions(title, numOfArts); 
    const arturl = `https://${safebooruOptions.hostname}${safebooruOptions.path}`;

    // Send requests to Safebooru API
    axios.get(arturl)
        // Send status header to the browser
        .then((rsp) => {
            res.writeHead(rsp.status,{'content-type': 'text/html'});
            return rsp.data; // this returns an xml string
        })
        // Handle the data retrieved
        .then((rsp) => {
            // Initialise a xml parser
            var parser = new xml2js.Parser();

            // Initialise a variable to hold image links
            var images = [];

            // Extract data from the xml string
            parser.parseString(rsp, function (err, result) {
                if (!(result['posts']['$']['count'] == 0)) {
                    images = result['posts']['post'];
                }
            })

            // Return images links
            return images;
        })
        // Reply to the client
        .then((rsp) =>{
            // Create the page based on the retrieved data
            const s = createDetailPage(info[0], info[1], rsp);

            // Write the page
            res.write(s);
            res.end();
        })
        // Handle errors if any
        .catch((error) => {
            // Display error page
            displayErrorPage(res);
        });
});

// Properties to query from Jikan API
function createJikanOptions(id) {
    const options = {
        hostname: 'api.jikan.moe/v4',
        port: 443,
        path: '/anime/' + id,
        method: 'GET'
    }

    return options;
}

// Properties to query from Safebooru API
function createSafebooruOptions(tag, limit) {
    const options = {
        hostname: 'safebooru.org',
        port: 443,
        path: '/index.php?page=dapi&s=post&q=index&tags=' + tag +'&limit=' + limit,
        method: 'GET'
    }

    return options;
}

// Handle images response from Safebooru API
function parseFanArtRsp(images) {
    // Check the number of images, if there is none, display a message
    if (images.length === 0){
        return "<p> There is no fan art available for this title.</p>"
    }
    
    // Initialise a string to hold the result
    // using Bootstrap grid
    let str = `<div class="row row-cols-3 row-cols-md-6 g-4">`;

    // For every image
    for (let i = 0; i < images.length; i++){
        // Add the image to the string
        str +=
        `<div class="col">
        <div class="card mb-1 h-100 text-center" style="border: 2px solid #a3a199">
            <div class = "card-body">
            <a href = "${images[i]['$']['file_url']}" target="_blank">
                <img src="${images[i]['$']['file_url']}" class="card-img-top" alt="${images[i]['$']['tags']}">
            </a>
            </div>
            <div class="card-footer">
                <h6>Created at: ${images[i]['$']['created_at']}</h6>
            </div>
        </div>
        </div>`;
    }

    // Close the Bootstrap grid div
    str += '</div>';

    // Return the result
    return str;
}

// Create result html page from the respond from the API
function createDetailPage(jikanAnimeRsp, jikanRecRsp, safebooruRsp) {
    // Anime details
    let details = 
    `<h1 class="text-center">${jikanAnimeRsp.title}</h1>
    <div class = "card p-2" style="border: 2px solid #a3a199">
    <div class = "row g-0">
        <div class = "col-md-3 col-lg-2 text-center align-self-center">
            <img src="${jikanAnimeRsp.images.jpg.image_url}" class="img-fluid rounded-start" alt="${jikanAnimeRsp.title_english}">
        </div>
        <div class = "col-md-9 col-lg-10">
        <div class = "card-body">
        <p class="card-text">${jikanAnimeRsp.synopsis}</p><hr>
        <p class="card-text">Rating: ${jikanAnimeRsp.rating}</p>
        <p class="card-text">Year: ${jikanAnimeRsp.year}</p>
        <p class="card-text">Status: ${jikanAnimeRsp.status}</p><hr>
        <p class="card-text"><a href="${jikanAnimeRsp.url}" target="_blank">View on MyAnimeList</a></p>
    </div></div></div></div>`;


    // Anime recommendations
    const numOfRec = 12; // The maximum number of recommendations showed
    let recommendations = ""; // string to hold the result
 
    // For every recommendation
    for (let i = 0; i < Math.min(numOfRec, jikanRecRsp.length); i++){
        // Get the data from the respond json
        let rec_json = jikanRecRsp[i].entry;

        // Add the recommendation to the string  
        recommendations +=
        `<div class="col">
        <div class="card mb-1 h-100 text-center " style="border: 2px solid #a3a199">
            <div class="card-body ">
            <img src="${rec_json.images.jpg.image_url}" class="card-img-top" alt="${rec_json.title}">
            </div>
            <div class="card-footer">
                <h6><a href="/anime/${rec_json.mal_id}" style="text-decoration: none">${rec_json.title}</a></h6>
            </div>
        </div>
        </div>`
    }
    
    // Anime fanarts
    const fanArts = parseFanArtRsp(safebooruRsp);

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

        <title>${jikanAnimeRsp.title}</title>
    </head>
    <body class = "m-4 bg-image" style="background-image: url('https://wallpaper.dog/large/10848834.jpg'); ">
    <div style="background-color: rgba(255, 255, 255, 0.8);" class = "p-4">` +
    
    details +
    
    `<h3 class ="py-3">You may also be interested in: </h2>
    <div class="row row-cols-3 row-cols-md-6 g-4">` +

    recommendations +

    `</div>
    <h3 class ="py-3">Fan Arts: </h2>` +
 
    fanArts +

    '</div></body></html>';

    // Return the full html string
    return str;
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