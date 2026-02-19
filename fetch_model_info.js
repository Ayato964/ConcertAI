
const https = require('https');
const fs = require('fs');

const url = 'https://e762-133-43-172-128.ngrok-free.app/model_info';
const outputPath = 'model_info_response.json';

console.log(`Fetching from ${url}...`);

https.get(url, (res) => {
    let data = '';

    console.log(`Status Code: ${res.statusCode}`);

    res.on('data', (chunk) => {
        data += chunk;
    });

    res.on('end', () => {
        try {
            const parsedData = JSON.parse(data);
            // Format with indentation
            const formattedJSON = JSON.stringify(parsedData, null, 2);
            fs.writeFileSync(outputPath, formattedJSON, 'utf8');
            console.log(`Successfully saved to ${outputPath}`);
            console.log(`Keys found: ${Object.keys(parsedData).join(', ')}`);

            // Peek at the content
            console.log('--- Content Preview ---');
            console.log(formattedJSON.substring(0, 500) + '...');
        } catch (e) {
            console.error('Error parsing JSON:', e.message);
            console.error('Raw data:', data);
        }
    });

}).on('error', (err) => {
    console.error('Error fetching data:', err.message);
});
