const aws = require('aws-sdk');

aws.config.update({
    region: 'ap-northeast-1'
});

const ddbTableName = 'users-db';

const dynamodb = new aws.DynamoDB.DocumentClient();

exports.handler = async (event) => {
    let response;
    console.log(event);
    switch (event.httpMethod) {
        case 'POST':
            response = await saveMsg(JSON.parse(event.body));
            break;
        case 'GET':
            response = await getMsg(event.queryStringParameters);
            break;
        default:
            response = buildResponse(404, '404 Not Found');
    }
    return response;
};


async function getMsg(parameters) {
    const params = {
        TableName: ddbTableName,
        Key: {
            MobNum: "+" + parameters.MobNum,
        }
    }
    const retData = await dynamodb.get(params).promise();
    return buildResponse(200, retData);
}

async function saveMsg(requestBody) {
    const params = {
        TableName: ddbTableName,
        Item: requestBody
    }
    const checkParams = {
        TableName: ddbTableName,
        Key: {
            MobNum: requestBody.MobNum
        }
    }
    const response = await dynamodb.get(checkParams).promise();
    console.log(response);
    if (Object.keys(response).length === 0 && response.constructor === Object) {
        // Do Nothing and Proceed
    }
    else {
        const RejBody = {
            response: "User Already Registered!"
        }
        return buildResponse(400, RejBody);
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