const aws = require('aws-sdk');
const https = require('https');
const querystring = require('querystring');
const lambda = new aws.Lambda();

aws.config.update({
    region: 'ap-northeast-1'
});

const ddbTableName = 'UserAuth';

const dynamodb = new aws.DynamoDB.DocumentClient();

exports.handler = async (event) => {
    // Twilio Account SID and Auth Token (set as environment variables in Lambda)
    const twilioAccountSid = "AC4a1db2e017a7b514a45f82ef2a739953";
    const twilioAuthToken = "5306fa3577b34a58980aeb78aa86738f";

    // Twilio API URL
    const twilioApiUrl = `https://api.twilio.com/2010-04-01/Accounts/${twilioAccountSid}/Messages.json`;

    function generateSixDigitCode() {
        const min = 100000; // Smallest 6-digit number
        const max = 999999; // Largest 6-digit number
        return Math.floor(Math.random() * (max - min + 1)) + min;
    }

    const lambdaParams = {
        FunctionName: 'user-registration',
        InvocationType: 'RequestResponse',
        LogType: 'None',
        Payload: JSON.stringify({ "httpMethod": "GET", "queryStringParameters": { "MobNum": String(JSON.parse(event.body).ToNum).slice(1) } }),
    }

    const response = await lambda.invoke(lambdaParams).promise();
    // console.log(JSON.parse(response.Payload));
    if (JSON.parse(response.Payload).body === "{}") {
        return {
            statusCode: 400,
            body: JSON.stringify('User Not registered!'),
        };
    }

    const otp = generateSixDigitCode();
    // Message data with default body
    let messageData = {
        To: JSON.parse(event.body).ToNum,
        From: '+17622382880',
        Body: otp, // Default body
        ProvideFeedback: 'true',
        ForceDelivery: 'true',
    };

    let dbdata = {
        MobNum: JSON.parse(event.body).ToNum,
        otp: otp
    };

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

    try {
        const response = await sendTwilioMessage(twilioApiUrl, postData, options);
        const dbstatus = await storeOtp(dbdata);
        if (response && dbstatus) {
            return {
                statusCode: 200,
                body: JSON.stringify('Message sent successfully'),
            };
        }
        else {
            return {
                statusCode: 500,
                body: JSON.stringify('Failed to send message'),
            };
        }

    } catch (error) {
        console.error('Error sending Twilio message:', error);
        return {
            statusCode: 500,
            body: JSON.stringify('Failed to send message'),
        };
    }
};

function sendTwilioMessage(apiUrl, data, options) {
    return new Promise((resolve, reject) => {
        const req = https.request(apiUrl, options, (res) => {
            let responseBody = '';

            res.on('data', (chunk) => {
                responseBody += chunk;
            });

            res.on('end', () => {
                if (res.statusCode === 201) {
                    resolve('Message sent successfully');
                } else {
                    reject(`Failed to send message. Status code: ${res.statusCode}`);
                }
            });
        });

        req.on('error', (err) => {
            reject(`Error sending request: ${err}`);
        });

        // Send the POST request with the message data
        req.write(data);
        req.end();
    });
}

async function storeOtp(data) {
    const params = {
        TableName: ddbTableName,
        Item: data
    }
    return await dynamodb.put(params).promise().then(() => {
        const body = {
            operation: 'insert',
            message: 'Success',
            Item: params.Item
        }
        return buildResponse(200, body);
    }, (error) => {
        console.log(error);
    });
}

function buildResponse(statusCode, body) {
    return {
        statusCode: statusCode,
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
    }
}