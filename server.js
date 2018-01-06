'use strict';

var express = require('express')
const fs = require('fs')
var app = express()
var bodyParser = require('body-parser');
var urlencodedParser = bodyParser.urlencoded({ extended: false })

 // Connect to Token's development sandbox
var TokenLib = require("token-io/dist/token-io.node.js");
var Token = new TokenLib('sandbox', '4qY7lqQw8NOl9gng0ZHgT4xdiDqxqoGVutuZwrUYQsI','./keys');

var member; // merchant member

function initServer(member, alias) {
    const address = alias.value;
    // Returns HTML file with {alias} replaced by email address
    app.get('/', function (req, res) {
        fs.readFile('index.html', 'utf8', function (err, contents) {
            res.set('Content-Type', 'text/html');
            res.send(contents.replace(/{alias}/g, address));
        })
    })
    var destinations = [{
        account: {
            sepa: {
                bic: 'IRONUSCA000',
                iban: 'DK5000440441116263'
            }
        }
    }];

    // Endpoint for transferring, called by client side after user approval
    app.post('/transfer', urlencodedParser, function (req, res) {
        console.log('User request', req.body);
        // Get the token first and check its validity
        member.getToken(req.body.tokenId)
            .then(function (token) {
                // Redeem the token to move the funds
                member.redeemToken(token, 4.99, 'EUR', 'Order 123', destinations)
                    .then(function (res) {
                        console.log('\n Reedeem Token Response:', res);
                    });
            });
    });
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
    const alias = {
        type: 'EMAIL',
        value: "msjs-" + Math.random().toString(36).substring(2, 10) + "+noverify@example.com"
    };
    Token.createMember(alias, Token.UnsecuredFileCryptoEngine).then(function(m) {
        member = m;
        // launch server
        initServer(member, alias);
    });
}
