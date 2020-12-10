
/*
dynamo.createTables((err: string) => {
  console.log(err);
});
//*/

/*
User.update({
    key: 'user#12345',
    guilds: ['111'],
    discord_id: '12345',
    username: 'mr_test',
    discriminator: '3232',
    address: {
        line1: 'MR. TEST',
        line2: '223 TEST WAY SE',
        line3: 'SEATTLE, WA 99900',
        country: 'United STATES',
    },
}, console.log);
History.update({
    key: 'history#111#0',
    guild: '111',
    round_id: '0',
    date: '2020-11-09T22:11:55.436Z',
    matches: [
        {
            to: '5656',
            from: '111',
            sent: false,
        },
    ],
}, console.log)
Metadata.update({
    key: 'metadata#111',
    guild: '111',
    authorized_users: ['12345'],
    active_users: ['12345'],
    group_channel: '112233',
}, console.log)
//*/

/*
function printResults(err, resp) {
    if(err) {
        console.log('Error running query', err);
    } else {
        console.log('Found', resp.Count, 'items');
        for (const item of resp.Items) {
            console.log(item.attrs);
        }
    }
};
//*/

/*
tables.User
  .query('user#12345')
  .exec((_: string, res: string) => console.log(res));
//*/

//let res = table
//    .query('metadata')
//    .exec(res => console.log(res));

/*
var AWS = require('aws-sdk');
// Set the region 
AWS.config.update({region: 'us-west-2'});

var ddb = new AWS.DynamoDB({apiVersion: '2012-08-10'});

var params = {
    TableName: 'Postman',
    ExpressionAttributeValues: {
        ":val": {
            "S": "metadata"
        }
    },
    KeyConditionExpression: 'id = :val'
};

async function run() {
    let res = await ddb.query(params, function(err, data) {
        if (err) {
            console.log("Error", err);
        } else {
            console.log("Success", data.Item);
        }
    }).promise();

    for (const item of res.Items) {
        console.log(JSON.stringify(item));
    }

    var Account = dynamo.define('Account', {
        hashKey : 'email',
        
        // enable timestamps support
        timestamps : true,
        
        // I don't want createdAt
        createdAt: false,
        
        // I want updatedAt to actually be called updateTimestamp
        updatedAt: 'updateTimestamp'
        
        schema : {
            email : Joi.string().email(),
        }
    });
}

run();
*/