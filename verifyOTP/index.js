const AWS = require('aws-sdk');
const dynamoDB = new AWS.DynamoDB();
AWS.config.update({
    region: 'ap-northeast-1'
});

exports.handler = async (event) => {
    // const requestBody = JSON.parse(event);
    console.log(event);
    const phone_number = JSON.parse(event.body).MobNum;
    const provided_otp = JSON.parse(event.body).otp;

    try {
        const params = {
            TableName: 'UserAuth',
            Key: {
                'MobNum': { S: phone_number }
            }
        };

        const data = await dynamoDB.getItem(params).promise();
        console.log(data);
        if (data.Item && data.Item.otp.N === provided_otp) {
            const deleteParams = {
                TableName: 'UserAuth',
                Key: {
                    'MobNum': { S: phone_number }
                }
            };

            await dynamoDB.deleteItem(deleteParams).promise();
            console.log("Item deleted successfully!");

            return {
                statusCode: 200,
                body: JSON.stringify('OTP verification successful')
            };
        } else {
            return {
                statusCode: 400,
                body: JSON.stringify('OTP verification failed')
            };
        }
    } catch (error) {
        console.error('Error:', error);
        return {
            statusCode: 500,
            body: 'Internal Server Error'
        };
    }
};
