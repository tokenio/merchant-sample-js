'use strict';

var express = require('express');
const fs = require('fs');
var app = express();
var bodyParser = require('body-parser');
var urlencodedParser = bodyParser.json({ extended: false });

 // It is strongly recommended that you use ES6 destructuring to require these objects (or ES6 named imports)
 // They are written here in ES5 for maximum browser compatibility since we do not transpile this code sample
 // See https://github.com/tokenio/sdk-js for details
var TokenIO = require('token-io').TokenIO; // main Token SDK entry object
var Alias = require('token-io').Alias; // Token alias constructor
var TransferEndpoint = require('token-io').TransferEndpoint; // Token transfer endpoint constructor

 // Connect to Token's development sandbox
var Token = new TokenIO({env: 'sandbox', developerKey: '4qY7lqQw8NOl9gng0ZHgT4xdiDqxqoGVutuZwrUYQsI', keyDir: './keys'});

var member; // merchant member

function initServer(member, alias) {
    const address = alias.value;
    // Returns HTML file with {alias} replaced by email address
    app.get('/', function (req, res) {
        fs.readFile('index.html', 'utf8', function (err, contents) {
            res.set('Content-Type', 'text/html');
            res.send(contents.replace(/{alias}/g, address));
        })
    });

    // Endpoint for transferring, called by client side after user approval
    app.post('/transfer', urlencodedParser, function (req, res) {
        const form = req.body;

        // set up the TokenTransferBuilder
        const tokenBuilder = member.createTransferTokenBuilder(form.amount, form.currency)
            .setDescription(form.description)
            .addDestination(TransferEndpoint.create(form.destination))
            .setToAlias(alias)
            .setToMemberId(member.memberId);
        // set up the TokenRequest
        const tokenRequest = Token.TokenRequest.create(tokenBuilder.build())
              .setRedirectUrl('http://localhost:3000/redeem');
        // store the token request
        member.storeTokenRequest(tokenRequest).then(function(request) {
            const requestId = request.id;
            const redirectUrl = Token.generateTokenRequestUrl(requestId);
            res.redirect(302, redirectUrl);
        });
    });

    app.get('/redeem', urlencodedParser, function (req, res) {
        //get the token ID from the callback url
        var tokenId = req.query.tokenId;
        member.getToken(tokenId)
            .then(function (token) {
                //Redeem the token to move the funds
                member.redeemToken(token)
                    .then(function (transfer) {
                        console.log('\n Redeem Token Response:', transfer);
                        res.status(200);
                        res.json(transfer)
                    });
            });
    });

    app.use(express.static(__dirname));
    app.listen(3000, function () {
        console.log('Example app listening on port 3000!')
    })
}

// If we know of a previously-created merchant member, load it; else create a new one.

// Token SDK stores member keys in files in ./keys.
// If merchant member's ID is "m:1234:567", its key file is "m_1234_567".
var keyPaths;
try {
    keyPaths = fs.readdirSync('./keys');
} catch (x) {
    keyPaths = [];
}
if (keyPaths && keyPaths.length) {
    const keyPath = keyPaths[0];
    const mid = keyPath.replace(/_/g, ":");
    member = Token.getMember(Token.UnsecuredFileCryptoEngine, mid);
}

// If member is defined, that means we found keys and loaded them.
if (member) {
    // We're using an existing merchant member. Fetch its alias (email address)
    member.firstAlias().then(function (alias) {
        // launch server
        initServer(member, alias);
    }, function (err) {
        console.log("Something went wrong: " + err);
        console.log("If member ID not found or firstAlias fails, `rm -r ./keys` and try again.");
    });
} else {
    // Didn't find an existing merchant member. Create a new one.
    const alias = Alias.create({
        type: 'DOMAIN',
        value: "msjs-" + Math.random().toString(36).substring(2, 10) + ".com"
    });
    Token.createBusinessMember(alias, Token.UnsecuredFileCryptoEngine).then(function(m) {
        member = m;
        // launch server
        initServer(member, alias);
    });
}
