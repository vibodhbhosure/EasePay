const https = require('https');
const querystring = require('querystring');

exports.handler = async (event) => {
    // Twilio Account SID and Auth Token (set as environment variables in Lambda)
    const twilioAccountSid = "AC4a1db2e017a7b514a45f82ef2a739953";
    const twilioAuthToken = "5306fa3577b34a58980aeb78aa86738f";

    // Twilio API URL
    const twilioApiUrl = `https://api.twilio.com/2010-04-01/Accounts/${twilioAccountSid}/Messages.json`;
    let messageData;
    // Message data
    if (event.v == "T") {
        messageData = {
            To: event.MobNum,
            From: '+17622382880',
            Body: 'Transaction Successfull!',
            ProvideFeedback: 'true',
            ForceDelivery: 'true',
        };
    } else {
        messageData = {
            To: event.MobNum,
            From: '+17622382880',
            Body: 'Transaction Failed!',
            ProvideFeedback: 'true',
            ForceDelivery: 'true',
        };
    }

    // Convert message data to URL-encoded format
    const postData = querystring.stringify(messageData);

    // HTTP request options
    const options = {
        method: 'POST',
        headers: {
            'Authorization': 'Basic ' + Buffer.from(`${twilioAccountSid}:${twilioAuthToken}`).toString('base64'),
            'Content-Type': 'application/x-www-form-urlencoded',
        },
    };

    return new Promise((resolve, reject) => {
        const req = https.request(twilioApiUrl, options, (res) => {
            let responseBody = '';

            res.on('data', (chunk) => {
                responseBody += chunk;
            });

            res.on('end', () => {
                if (res.statusCode === 201) {
                    resolve('Message sent successfully');
                } else {
                    console.log(res);
                    reject(`Failed to send message. Status code: ${res.statusCode}`);
                }
            });
        });

        req.on('error', (err) => {
            reject(`Error sending request: ${err}`);
        });

        // Send the POST request with the message data
        req.write(postData);
        req.end();
    });
};
