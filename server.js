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

async function init() {
    var alias; // merchant alias
    var member; // merchant member
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
        try {
            alias = await member.firstAlias();
        } catch (e) {
            console.log("Something went wrong: " + err);
            console.log("If member ID not found or firstAlias fails, `rm -r ./keys` and try again.");
            throw e;
        }
    } else {
        // Didn't find an existing merchant member. Create a new one.
        // If a domain alias is used instead of an email, please contact Token
        // with the domain and member ID for verification.
        // See https://developer.token.io/sdk/#aliases for more information.
        alias = {
            type: 'EMAIL',
            value: "msjs-" + Math.random().toString(36).substring(2, 10) + "+noverify@example.com"
        };
        member = await Token.createMember(alias, Token.UnsecuredFileCryptoEngine);
        // A member's profile has a display name and picture.
        // The Token UI shows this (and the alias) to the user when requesting access.
        await member.setProfile({
            displayNameFirst: 'Demo Merchant'
        });
        await member.setProfilePicture('img/gif', 'R0lGODlhAQABAIABAP///wAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==');
    }

    // launch server
    return initServer(member, alias);
}

async function initServer(member, alias) {
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
    app.get('/transfer', async function (req, res) {
        var destination = {
            account: {
                fasterPayments: {
                    sortCode: '123456',
                    accountNumber: '12345678',
                },
            },
        };
        var queryData = req.query;
        var nonce = Token.Util.generateNonce();
        req.session.nonce = nonce;
        var redirectUrl = req.protocol + '://' + req.get('host') + '/redeem';

        // set up the TokenRequest
        var tokenRequest = Token.createTransferTokenRequest(queryData.amount, queryData.currency)
            .setDescription(queryData.description)
            .setToAlias(alias)
            .setToMemberId(member.memberId())
            .addDestination(destination)
            .setRedirectUrl(redirectUrl)
            .setCallbackState({a: 1}) // arbitrary data
            .setCSRFToken(nonce);

        // store the token request
        var request = await member.storeTokenRequest(tokenRequest)
        var requestId = request.id;
        var tokenRequestUrl = Token.generateTokenRequestUrl(requestId);
        res.redirect(302, tokenRequestUrl);
    });

    // Endpoint for transferring, called by client side after user approval
    app.post('/transfer-popup', urlencodedParser, async function (req, res) {
        var destination = {
            account: {
                fasterPayments: {
                    sortCode: '123456',
                    accountNumber: '12345678',
                },
            },
        };
        var form = req.body;
        var nonce = Token.Util.generateNonce();
        req.session.nonce = nonce;
        var redirectUrl = req.protocol + '://' + req.get('host') + '/redeem-popup';

        // set up the TokenRequest
        var tokenRequest = Token.createTransferTokenRequest(form.amount, form.currency)
            .setDescription(form.description)
            .setToAlias(alias)
            .setToMemberId(member.memberId())
            .addDestination(destination)
            .setRedirectUrl(redirectUrl)
            .setCallbackState({a: 1}) // arbitrary data
            .setCSRFToken(nonce);

        // store the token request
        var request = await member.storeTokenRequest(tokenRequest);
        var requestId = request.id;
        var tokenRequestUrl = Token.generateTokenRequestUrl(requestId);
        res.status(200).send(tokenRequestUrl);
    });
    
    // for redirect flow, use Token.parseTokenRequestCallbackUrl()
    app.get('/redeem', urlencodedParser, async function (req, res) {
        //get the token ID from the callback url
        var callbackUrl = req.protocol + '://' + req.get('host') + req.originalUrl;
        var result = await Token.parseTokenRequestCallbackUrl(callbackUrl, req.session.nonce);
        var token = await member.getToken(result.tokenId);
        //Redeem the token to move the funds
        var transfer = await member.redeemToken(token);
        console.log('\n Redeem Token Response:', transfer);
        res.status(200);
        res.send('Success! Redeemed transfer ' + transfer.id);
    });

    // for popup flow, use Token.parseTokenRequestCallbackParams()
    app.get('/redeem-popup', urlencodedParser, async function (req, res) {
        //get the token ID from the callback url
        var data = req.query.data;
        var result = await Token.parseTokenRequestCallbackParams(JSON.parse(data), req.session.nonce);
        var token = await member.getToken(result.tokenId);
        //Redeem the token to move the funds
        var transfer = await member.redeemToken(token);
        console.log('\n Redeem Token Response:', transfer);
        res.status(200);
        res.send('Success! Redeemed transfer ' + transfer.id);
    });

    app.use(express.static(__dirname));
    app.listen(3000, function () {
        console.log('Example app listening on port 3000!')
    })
}

init();
