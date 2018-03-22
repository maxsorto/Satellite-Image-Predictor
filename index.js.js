/*
**Author: Max Sorto
**Description: 
	Calls out to NASA's API to request satellite imagery of a Lat,Lng pair, 
	then uses the information received to calculate when the next satellite image will be captured.
*/

'use strict';

// Required library to make REST calls.
const request = require('request');

// NASA's API key.
const apiKey = '9Jz6tLIeJ0yY9vjbEUWaH9fsXA930J9hspPchute';

// Execute...
main()
.then(console.log)
.catch(console.error);

/*
Predicts the next time a satellite will take an image of
a specific lat,lng pair based on historical data.
*/
async function flyBy(latitude, longitude)
{
    try {

        let coordinates = {
            latitude: latitude,
            longitude: longitude
        };

        // Check if coordinates exist...
        Object.keys(coordinates).forEach(key => {
            if (!coordinates[key]) throw `Error: Did not supply ${key} parameter to flyBy() function.`;
        });
        
        // Check if coordinates are valid...
        coordinates = validateCoordinates(coordinates);

        // Request available imagery from NASA...
        const availableImagery = await callAPI(coordinates);

        // Make prediction for  when next image will be captured based on available imagery...
        const nextImageCapture = calculateNextCaptureDate(availableImagery);

        return 'Next time: ' + new Date(nextImageCapture);
    }
    catch(err) {throw err;}
}

/*
Checks if coordinates are valid latitude and longitudes.
*/
function validateCoordinates(coordinates)
{
    const lat = coordinates.latitude,
          lon = coordinates.longitude;

    // Check type and constraints...
    const validLat = (lat) => (!isNaN(lat) && lat !== null) && lat >= -90 && lat <= 90;
    const validLng = (lon) => (!isNaN(lon) && lon !== null) && lon >= -180 && lon <= 180;

    // Throw errors if validation failed...
    if (!validLat(lat)) throw 'Error: Latitude is not a valid number within the range of -90 to 90';
    if (!validLng(lon)) throw 'Error: Longitude is not a valid number within the range of -180 to 180';

    return coordinates;
}

/*
Calls out to NASA's API to retrieve results for available 
satellite imagery for a specific latitude and longitude.
*/
function callAPI(coordinates)
{
    return new Promise((resolve, reject) => {
        const options = { 
            method: 'GET', // Type of request
            url: 'https://api.nasa.gov/planetary/earth/assets', // Endpoint
            qs: { // Required parameters...
                lat: coordinates.latitude,
                lon: coordinates.longitude,                
                api_key: apiKey 
            },
            headers: {'cache-control': 'no-cache'} // Required or we get an HTTPS error.
        };
      
        request(options, (err, res, data) => {
            if (!err && res.statusCode === 200) resolve(JSON.parse(data));
            else reject(`API Error: Status code ${res.statusCode}\n ${err}`);
        });
    });     
}

/*
Calculates the next time a satellite will capture an image
based on the average amount of time between images captured.
*/
function calculateNextCaptureDate(times)
{
    // Check if we have enough data to make prediction...
    if (times.results.length <= 1) throw 'Error: Not enough satellite imagery to make prediction.'

    // First convert all dates to UNIX times and sort them in ascending order...
    const sortedTimes = times.results.map(time => (new Date(time.date)).getTime()).sort();

    // Prepare empty array; to be populated with times between two dates of image capture times...
    const timesBetweenImages = [];
    
    let i = 0;

    do { // Store the time in between captures in the timesBetweenImages array...
        const timeBetween = sortedTimes[i+1] - sortedTimes[i];
    
        timesBetweenImages.push(timeBetween);

        i++;            
    }
    while (times.results[i+1]); // While there is still a day to compare against.

    // Calculate the average time between captures for all available data...
    const avgTime = timesBetweenImages.reduce((total, timeBetween) => total + timeBetween) / timesBetweenImages.length;

    // Add average time to the last day of our available data...
    const nextCaptureDate = new Date(sortedTimes[sortedTimes.length - 1] + avgTime);

    return nextCaptureDate;
}

/*------Main------*/

/*
Performs a happy path test on our flyBy function.
*/
async function main()
{
    //Function for happy path tests (did not do this for negative tests to get around `throw` ending our execution)
    const happyPathTest = (testFunction, consoleMessage) => {
        console.log(consoleMessage);
        try {
            const test = testFunction;
            console.log(test+'\n');
            console.log('PASSED!\n');
        }
        catch(e) {
          console.log(e);
          console.log('FAILED');
        }
    };
    
    //Happy path tests...
    happyPathTest(await flyBy(36.098592, -112.097796), '-->\nTest 1: Grand Canyon Test (Expects Pass):::\n');
    happyPathTest(await flyBy(43.078154, -79.075891), '-->\nTest 2: Niagra Falls Test (Expects Pass):::\n');
    happyPathTest(await flyBy(36.998979, -109.045183), '-->\nTest 3: Four Corners Monument Test (Expects Pass):::\n');

    return 'Done';   
}
