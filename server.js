'use strict';
var express = require('express')
var app = express()
var bodyParser = require('body-parser');
var urlencodedParser = bodyParser.urlencoded({ extended: false })

 // Connect to Token's development sandbox
var TokenLib = require("token-io/dist/token-io.node.js");
var Token = new TokenLib('sandbox', './keys');

// Initializes the server.
var member = Token.login(Token.UnsecuredFileCryptoEngine, 'm:4DjRgwNWdDAqQWo5gyCMn71mtEn2:5zKtXEAq');
console.log('Logged in as: ', member.memberId());

// Endpoint for transferring, called by client side after user approval
app.post('/transfer', urlencodedParser, function (req, res) {
  console.log('User request', req.body);
  member.getToken(req.body.tokenId)  // Make sure to get the token first, and check it's validity
    .then(function (token) {
        member.redeemToken(token, 4.99, 'EUR')  // Redeem the token at the server, to move the funds
          .then(function (res) {
              console.log('\n Reedeem Token Response:', res);
          });
    });
})

// Returns HTML file
app.get('/', function (req, res) {
  res.sendFile('index.html', {root: __dirname });
})

// Starts the server
app.listen(3000, function () {
  console.log('Example app listening on port 3000!')
})
