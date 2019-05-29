'use strict';

var express = require('express');
var fs = require('fs');
var app = express();
var cookieSession = require('cookie-session');
var bodyParser = require('body-parser');
var urlencodedParser = bodyParser.json({ extended: false });

 // See https://github.com/tokenio/sdk-js for details
var TokenClient = require('@token-io/tpp').TokenClient; // main Token SDK entry object

 // Connect to Token's development sandbox, if you change this, you also need to change window.Token({env}) in client.js
var Token = new TokenClient({env: 'sandbox', developerKey: '4qY7lqQw8NOl9gng0ZHgT4xdiDqxqoGVutuZwrUYQsI', keyDir: './keys'});

var member; // merchant member

function initServer(member, alias) {
    app.use(cookieSession({
        name: 'session',
        keys: ['cookieSessionKey'],
        // Cookie Options
        maxAge: 24 * 60 * 60 * 1000, // 24 hours
    }));

    app.get('/', function (req, res) {
        fs.readFile('index.html', 'utf8', function (err, contents) {
            res.set('Content-Type', 'text/html');
            res.send(contents);
        })
    });

    // Endpoint for transferring, called by client side after user approval
    app.post('/transfer', urlencodedParser, function (req, res) {
        var form = req.body;
        var nonce = Token.Util.generateNonce();
        req.session.nonce = nonce;
        // set up the TokenRequest
        var tokenRequest = Token.createTransferTokenRequest(form.amount, form.currency)
            .setDescription(form.description)
            .setToAlias(alias)
            .setToMemberId(member.memberId())
            .addDestination(form.destination)
            .setRedirectUrl('http://localhost:3000/redeem-redirect')
            .setCallbackState({a: 1}) // arbitrary data
            .setCSRFToken(nonce);
        // store the token request
        member.storeTokenRequest(tokenRequest).then(function(request) {
            var requestId = request.id;
            var redirectUrl = Token.generateTokenRequestUrl(requestId);
            res.status(200).send(redirectUrl);
        }).catch(console.log);
    });

    // for popup flow, use Token.parseTokenRequestCallbackParams()
    app.get('/redeem', urlencodedParser, function (req, res) {
        //get the token ID from the callback url
        var data = req.query.data;
        Token.parseTokenRequestCallbackParams(JSON.parse(data), req.session.nonce).then(function (result) {
            return member.getToken(result.tokenId)
                .then(function (token) {
                    //Redeem the token to move the funds
                    member.redeemToken(token)
                        .then(function (transfer) {
                            console.log('\n Redeem Token Response:', transfer);
                            res.status(200);
                            res.send('Success! Redeemed transfer ' + transfer.id);
                        });
                });
        })
    });

    // for redirect flow, use Token.parseTokenRequestCallbackUrl()
    app.get('/redeem-redirect', urlencodedParser, function (req, res) {
        //get the token ID from the callback url
        var callbackUrl = req.protocol + '://' + req.get('host') + req.originalUrl;
        Token.parseTokenRequestCallbackUrl(callbackUrl, req.session.nonce).then(function (result) {
            return member.getToken(result.tokenId)
                .then(function (token) {
                    //Redeem the token to move the funds
                    member.redeemToken(token)
                        .then(function (transfer) {
                            console.log('\n Redeem Token Response:', transfer);
                            res.status(200);
                            res.send('Success! Redeemed transfer ' + transfer.id);
                        });
                });
        })
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
    var keyPath = keyPaths[0];
    var mid = keyPath.replace(/_/g, ":");
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
    // If a domain alias is used instead of an email, please contact Token
    // with the domain and member ID for verification.
    // See https://developer.token.io/sdk/#aliases for more information.
    var alias = {
        type: 'EMAIL',
        value: "msjs-" + Math.random().toString(36).substring(2, 10) + "+noverify@example.com"
    };
    Token.createMember(alias, Token.UnsecuredFileCryptoEngine).then(function (m) {
        member = m;
        // A member's profile has a display name and picture.
        // The Token UI shows this (and the alias) to the user when requesting access.
        member.setProfile({
            displayNameFirst: 'Demo Merchant'
        })
            .then(function () {
                member.setProfilePicture('image/png', fs.readFileSync('southside.png'))
            })
            .then(function () {
                initServer(member, alias)
            });
    });
}
