'use strict';

const address = 'mariano876+noverify@example.com';

var express = require('express')
const fs = require('fs')
var app = express()
var bodyParser = require('body-parser');
var urlencodedParser = bodyParser.urlencoded({ extended: false })

 // Connect to Token's development sandbox
var TokenLib = require("token-io/dist/token-io.node.js");
var Token = new TokenLib('sandbox', '4qY7lqQw8NOl9gng0ZHgT4xdiDqxqoGVutuZwrUYQsI','./keys');

// Initializes the server.

var member; // merchant member
Token.resolveAlias({ // look up merchant member's ID by address...
    type: 'EMAIL',
    value: address
}).then( function(structWithMemberId) { // ...and log in using keys
    member = Token.login(
        Token.UnsecuredFileCryptoEngine,
        structWithMemberId.id);
    console.log('Logged in as: ', member.memberId());
});

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
})

// Returns HTML file with {alias} replaced by email address
app.get('/', function (req, res) {
    fs.readFile('index.html', 'utf8', function (err, contents) {
        res.set('Content-Type', 'text/html');
        res.send(contents.replace(/{alias}/g, address));
    })
})

// Starts the server
app.listen(3000, function () {
  console.log('Example app listening on port 3000!')
})
