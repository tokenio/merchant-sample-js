'use strict';

var express = require('express');
var fs = require('fs');
var app = express();
var cookieSession = require('cookie-session');
var bodyParser = require('body-parser');
var urlencodedParser = bodyParser.json({ extended: false });
var fetch = require('node-fetch');

var TOKEN_REQUEST_URL = 'https://api.sandbox.token.io/token-requests';
var TOKEN_APP_URL = 'https://app.sandbox.token.io/session';
var AUTH_HEADER = 'Basic bS0zYTNEUktZeVVzS1oyZUdmeWpVczlNWk5TdDlzLTV6S3RYRUFxOjhjOWIwMDY3LTE0YmItNDdhYi1iMDdkLWVlMDM3NDE2MjllYw==';
var MEMBER_ID = 'm:3a3DRKYyUsKZ2eGfyjUs9MZNSt9s:5zKtXEAq';

app.use(cookieSession({
    name: 'session',
    keys: ['cookieSessionKey'],
    maxAge: 24 * 60 * 60 * 1000,
}));

app.get('/', function (req, res) {
    fs.readFile('index.html', 'utf8', function (err, contents) {
        res.set('Content-Type', 'text/html');
        res.send(contents);
    })
});

app.post('/transfer', urlencodedParser, async function (req, res) {
    var form = req.body;
    var redirectUrl = req.protocol + '://' + req.get('host') + '/redeem';

    var payload = {
        requestPayload: {
            refId: Math.random().toString(36).substring(2),
            to: {
                id: MEMBER_ID,
            },
            transferBody: {
                currency: form.currency,
                lifetimeAmount: String(form.amount),
                instructions: {
                    transferDestinations: [
                        {
                            fasterPayments: {
                                sortCode: '123456',
                                accountNumber: '12345678',
                            },
                            customerData: {
                                legalNames: ['Token Payload Builder'],
                            },
                        },
                    ],
                },
                returnRefundAccount: true,
            },
            redirectUrl: redirectUrl,
        },
    };

    var response = await fetch(TOKEN_REQUEST_URL, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': AUTH_HEADER,
        },
        body: JSON.stringify(payload),
    });

    var result = await response.json();
    var requestId = result.tokenRequest.id;
    var tokenRequestUrl = `${TOKEN_APP_URL}/${requestId}`;
    res.status(200).send(tokenRequestUrl);
});

app.get('/redeem', urlencodedParser, async function (req, res) {
    // TODO: replace with HTTP API call for redeeming tokens
    res.status(200);
    res.send('Success! Token redeemed.');
});

app.use(express.static(__dirname));
app.listen(3000, function () {
    console.log('Example app listening on port 3000!')
});
