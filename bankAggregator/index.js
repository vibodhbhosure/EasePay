const aws = require("aws-sdk");

aws.config.update({
    region: 'ap-northeast-1'
});

const ddbTableName = 'bankTransactions';
const dynamodb = new aws.DynamoDB.DocumentClient();
const txnOP = ['Transaction Successful', 'Incorrect Pin', 'Insufficient Balance', 'Bank Server Down'];

exports.handler = async (event) => {
    const hashMsg = event.hashMsg;
    const initiator = event.initiator;
    console.log(hashMsg);
    const hashMsgArr = hashMsg.split('x');
    console.log(hashMsgArr);

    //Txn Record
    let txn = {
        T: hashMsgArr[0],
        initiator: initiator,
        MobNum: hashMsgArr[1],
        amt: hashMsgArr[2],
        securePin: hashMsgArr[3],
        txnId: hashMsgArr[1] + hashMsgArr[4],
        txnStatus: 'Pending',
        remark: 'Transaction Initiated'
    };


    let response = {
        statusCode: 200,
        body: JSON.stringify('Transaction Approved')
    };

    //Transaction Approval
    const randomValue = Math.random();
    if (randomValue < 0.9) {
        txn.remark = txnOP[0];
        txn.txnStatus = 'Success';
    }
    else {
        txn.remark = txnOP[Math.floor(Math.random() * (txnOP.length - 1)) + 1];
        txn.txnStatus = 'Failed';
        response.statusCode = 400;
        response.body = JSON.stringify('Transaction Declined. Check Log');
    }

    //Save Txn
    const params = {
        TableName: ddbTableName,
        Item: { ...txn }
    }

    //Log to DB
    await dynamodb.put(params).promise().then(() => {
        console.log('Txn Entered');
    }, (error) => {
        console.log(error);
    });

    return response;
};
