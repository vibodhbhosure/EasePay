const aws = require('aws-sdk');
const querystring = require('querystring');
const lambda = new aws.Lambda();

aws.config.update({
    region: 'ap-northeast-1'
});

const ddbTableName = 'messages';

const dynamodb = new aws.DynamoDB.DocumentClient();

exports.handler = async (event) => {
    let response;
    console.log(event);
    console.log("-----------");
    const formData = querystring.parse(event.body);
    const data = JSON.stringify(formData.body).split(" ")[2].split("\\n");
    const params = {
        messageValue: data[1].substring(0, data[1].length - 1),
        mobileNumber: data[0]
    }
    console.log(data);
    switch (event.httpMethod) {
        case 'POST':
            response = await saveMsg(params);
            break;
        case 'GET':
            response = await getMsg(event.body);
            break;
        case 'PUT':
            const requestBody = JSON.parse(event.body);
            response = await updateMsg(requestBody.messageValue, requestBody.mobileNumber, requestBody.updateKey, requestBody.updateValue);
            break;
        case 'DELETE':
            response = await deleteMsg(JSON.parse(event.body));
            break;
        default:
            response = buildResponse(404, '404 Not Found');
    }
    return response;
};

async function deleteMsg(eventBody) {
    const params = {
        TableName: ddbTableName,
        Key: {
            messageValue: eventBody.messageValue,
            mobileNumber: eventBody.mobileNumber
        },
        returnValues: "ALL_OLD"
    }

    return await dynamodb.delete(params).promise().then((response) => {
        const body = {
            operation: 'delete',
            message: 'Success',
            Item: response
        }
        return buildResponse(200, body);
    }, (error) => {
        console.log(error);
    })
}

async function updateMsg(messageValue, mobileNumber, key, value) {
    const params = {
        TableName: ddbTableName,
        Key: {
            "messageValue": messageValue,
            "mobileNumber": mobileNumber
        },
        UpdateExpression: `SET ${key} = :updateValue`,
        ExpressionAttributeValues: {
            ":updateValue": value
        },
        returnValues: "UPDATE_NEW"
    }

    return await dynamodb.update(params).promise().then((response) => {
        const body = {
            operation: 'update',
            message: 'Success',
            Item: response
        }
        return buildResponse(200, body);
    }, (error) => {
        console.log(error);
    })
}

async function getMsg() {
    const params = {
        TableName: ddbTableName
    }
    const messages = await dynamodb.scan(params).promise();
    const body = {
        messages: messages
    }

    return buildResponse(200, body);
}

async function saveMsg(requestBody) {
    let TransStatus;
    let lambdaParams;
    const transResponse = await validateTransaction();
    console.log(transResponse);
    if (transResponse === 1) {
        TransStatus = {
            TrnStatus: "Success"
        }
        lambdaParams = {
            FunctionName: 'sendSMS',
            InvocationType: 'RequestResponse',
            LogType: 'None',
            Payload: JSON.stringify({ "v": "T", "MobNum": requestBody.mobileNumber }),
        }
    } else {
        TransStatus = {
            TrnStatus: "Failed"
        }
        lambdaParams = {
            FunctionName: 'sendSMS',
            InvocationType: 'RequestResponse',
            LogType: 'None',
            Payload: JSON.stringify({ "v": "F", "MobNum": requestBody.mobileNumber }),
        }
    }
    const response = await lambda.invoke(lambdaParams).promise();
    if (response.StatusCode !== 200) {
        throw new Error('Failed to get response from lambda function')
    }
    const params = {
        TableName: ddbTableName,
        Item: { ...requestBody, ...TransStatus }
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

async function validateTransaction() {
    const randomValue = Math.random();
    if (randomValue < 0.9) {
        return 1;
    }
    else {
        return 0;
    }

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