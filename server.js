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
var Token = new TokenClient({ env: 'sandbox', developerKey: '4qY7lqQw8NOl9gng0ZHgT4xdiDqxqoGVutuZwrUYQsI', keyDir: './keys' });
var tokenRequestId = "";


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
            console.log("Something went wrong: " + e);
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
        await member.setProfilePicture('image/png', fs.readFileSync('southside.png'))
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
            sepa: {
                iban: 'bic',
                bic: 'DE16700222000072880129'
            },
            customerData: {
                legalNames: ['merchant-sample-js']
            }
        };

        var queryData = req.query;
        var refId = Token.Util.generateNonce();
        var csrfToken = Token.Util.generateNonce();
        req.session.csrfToken = csrfToken;
        var redirectUrl = req.protocol + '://' + req.get('host') + '/redeem';

        // set up the TokenRequest
        var tokenRequest = Token.createTransferTokenRequest(queryData.amount, queryData.currency)
            .setDescription(queryData.description)
            .setToAlias(alias)
            .setToMemberId(member.memberId())
            .addTransferDestination(destination)
            .setRedirectUrl(redirectUrl)
            .setCSRFToken(csrfToken)
            .setRefId(refId);

        // store the token request
        var request = await member.storeTokenRequest(tokenRequest)
        var requestId = request.id;
        var tokenRequestUrl = Token.generateTokenRequestUrl(requestId);
        res.redirect(302, tokenRequestUrl);
    });

    // Endpoint for transferring, called by client side after user approval
    app.post('/transfer-popup', urlencodedParser, async function (req, res) {
        var destination = {
            sepa: {
                iban: 'bic',
                bic: 'DE16700222000072880129'
            },
            customerData: {
                legalNames: ['merchant-sample-js']
            }
        };

        var form = req.body;
        var refId = Token.Util.generateNonce();
        var csrfToken = Token.Util.generateNonce();
        req.session.csrfToken = csrfToken;
        var redirectUrl = req.protocol + '://' + req.get('host') + '/redeem-popup';

        // set up the TokenRequest
        var tokenRequest = Token.createTransferTokenRequest(form.amount, form.currency)
            .setDescription(form.description)
            .setToAlias(alias)
            .setToMemberId(member.memberId())
            .addTransferDestination(destination)
            .setRedirectUrl(redirectUrl)
            .setCSRFToken(csrfToken)
            .setRefId(refId);

        // store the token request
        var request = await member.storeTokenRequest(tokenRequest);
        var requestId = request.id;
        var tokenRequestUrl = Token.generateTokenRequestUrl(requestId);
        res.status(200).send(tokenRequestUrl);
    });

    app.get('/standing-order', async function (req, res) {
        var redirectUrl = req.protocol + '://' + req.get('host') + '/redeem-standing-order';
        var destination = {
            sepa: {
                iban: 'bic',
                bic: 'DE16700222000072880129'
            },
            customerData: {
                legalNames: ['merchant-sample-js']
            }
        };

        var requestData = req.query;
        var refId = Token.Util.generateNonce();
        var csrfToken = Token.Util.generateNonce();
        req.session.csrfToken = csrfToken;

        var startDate = new Date().toISOString().split("T")[0];
        var endDate = new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString().split("T")[0];

        var tokenRequest = Token.createStandingOrderTokenRequest(requestData.amount, requestData.currency, 'MNTH', startDate, endDate)
            .addTransferDestination(destination)
            .setDescription(requestData.description)
            .setToAlias(alias)
            .setToMemberId(member.memberId())
            .setRedirectUrl(redirectUrl)
            .setCSRFToken(csrfToken)
            .setRefId(refId);

        var request = await member.storeTokenRequest(tokenRequest)
        var requestId = request.id;
        var tokenRequestUrl = Token.generateTokenRequestUrl(requestId);

        res.redirect(302, tokenRequestUrl);
    });

    app.post('/standing-order-popup', urlencodedParser, async function (req, res) {
        var redirectUrl = req.protocol + '://' + req.get('host') + '/redeem-standing-order-popup';

        var destination = {
            sepa: {
                iban: 'bic',
                bic: 'DE16700222000072880129'
            },
            customerData: {
                legalNames: ['merchant-sample-js']
            }
        };

        var requestData = req.body;
        var refId = Token.Util.generateNonce();
        var csrfToken = Token.Util.generateNonce();
        req.session.csrfToken = csrfToken;

        var startDate = new Date().toISOString().split("T")[0];
        var endDate = new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString().split("T")[0];

        var tokenRequest = Token.createStandingOrderTokenRequest(requestData.amount, requestData.currency, 'MNTH', startDate, endDate)
            .addTransferDestination(destination)
            .setDescription(requestData.description)
            .setToAlias(alias)
            .setToMemberId(member.memberId())
            .setRedirectUrl(redirectUrl)
            .setCSRFToken(csrfToken)
            .setRefId(refId);

        var request = await member.storeTokenRequest(tokenRequest)
        var requestId = request.id;
        var tokenRequestUrl = Token.generateTokenRequestUrl(requestId);

        res.status(200).send(tokenRequestUrl);
    });

    app.get('/future-dated', async function (req, res) {
        var redirectUrl = req.protocol + '://' + req.get('host') + '/redeem-future-dated';

        var destination = {
            sepa: {
                iban: 'bic',
                bic: 'DE16700222000072880129'
            },
            customerData: {
                legalNames: ['merchant-sample-js']
            }
        };

        var requestData = req.query;
        var refId = Token.Util.generateNonce();
        var csrfToken = Token.Util.generateNonce();
        req.session.csrfToken = csrfToken;

        //Setting the execution date of payment for after 2 days
        var executionDate = new Date();
        executionDate.setDate(new Date().getDate() + 2);

        var tokenRequest = Token.createTransferTokenRequest(requestData.amount, requestData.currency)
            .setToAlias(alias)
            .setToMemberId(member.memberId())
            .setDescription(requestData.description)
            .setRedirectUrl(redirectUrl)
            .setCSRFToken(csrfToken)
            .setRefId(refId)
            .setExecutionDate(executionDate.toISOString().split("T")[0])
            .addTransferDestination(destination);

        var request = await member.storeTokenRequest(tokenRequest)
        var requestId = request.id;
        var tokenRequestUrl = Token.generateTokenRequestUrl(requestId);

        res.redirect(302, tokenRequestUrl);
    });

    app.post('/future-dated-popup', urlencodedParser, async function (req, res) {
        var redirectUrl = req.protocol + '://' + req.get('host') + '/redeem-future-dated-popup';
        var destination = {
            sepa: {
                iban: 'bic',
                bic: 'DE16700222000072880129'
            },
            customerData: {
                legalNames: ['merchant-sample-js']
            }
        };

        var requestData = req.body;
        var refId = Token.Util.generateNonce();
        var csrfToken = Token.Util.generateNonce();
        req.session.csrfToken = csrfToken;

        //Setting the execution date of payment for after 2 days
        var executionDate = new Date();
        executionDate.setDate(new Date().getDate() + 1);
        var tokenRequest = Token.createTransferTokenRequest(requestData.amount, requestData.currency)
            .setToAlias(alias)
            .setToMemberId(member.memberId())
            .setDescription(requestData.description)
            .setRedirectUrl(redirectUrl)
            .setCSRFToken(csrfToken)
            .setRefId(refId)
            .setExecutionDate(executionDate.toISOString().split("T")[0])
            .addTransferDestination(destination);

        var request = await member.storeTokenRequest(tokenRequest)
        var requestId = request.id;
        var tokenRequestUrl = Token.generateTokenRequestUrl(requestId);

        res.status(200).send(tokenRequestUrl);
    });

    // Endpoint for transferring, called by client side after user approval
    app.get('/one-step-payment', async function (req, res) {
        var transferDestination = {
                sepa: {
                    iban: 'DE16700222000072880129',
                    bic: '123456'
                },
            customerData: {
                legalNames: ['merchant-sample-js']
            }
        };

        var destination = {
            account: {
                sepa: {
                    iban: 'DE16700222000072880129',
                    bic: '123456'
                }
            },
            customerData: {
                legalNames: ['merchant-sample-js']
            }
        };
        var bankId = "ngp-cbi-05034";
        var source = {
            account: {
                iban: {
                    iban: "IT77O0848283352871412938123"
                }
            },
            bankId: bankId
        };
        var queryData = req.query;
        var refId = Token.Util.generateNonce();
        var csrfToken = Token.Util.generateNonce();
        req.session.csrfToken = csrfToken;
        var redirectUrl = req.protocol + '://' + req.get('host') + '/redeem';

        // set up the TokenRequest
        var tokenRequest = Token.createTransferTokenRequest(queryData.amount, queryData.currency)
            .setDescription(queryData.description)
            .setToAlias(alias)
            .setToMemberId(member.memberId())
            .addDestination(destination)
            .setRedirectUrl(redirectUrl)
            .setCSRFToken(csrfToken)
            .setRefId(refId)
            .setSource(source)
            .setBankId(bankId)
            .addTransferDestination(transferDestination);
        console.log("Token Request: "+JSON.stringify(tokenRequest));
        // store the token request
        var request = await member.storeTokenRequest(tokenRequest)
        var requestId = request.id;
        var tokenRequestUrl = Token.generateTokenRequestUrl(requestId);
        tokenRequestUrl += "?dk=smartym";
        res.redirect(302, tokenRequestUrl);
    });

    // Endpoint for transferring, called by client side after user approval
    app.post('/one-step-payment-popup', urlencodedParser, async function (req, res) {
        var transferDestination = {
            sepa: {
                iban: 'DE16700222000072880129',
                bic: '123456'
            },
            customerData: {
                legalNames: ['merchant-sample-js']
            }
        };

        var destination = {
            account: {
                sepa: {
                    iban: 'DE16700222000072880129',
                    bic: '123456'
                }
            },
            customerData: {
                legalNames: ['merchant-sample-js']
            }
        };
        
        var bankId = "ngp-cbi-05034";
        var source = {
            account: {
                iban: {
                    iban: "IT77O0848283352871412938123"
                }
            },
            bankId: bankId
        };

        var form = req.body;
        var refId = Token.Util.generateNonce();
        var csrfToken = Token.Util.generateNonce();
        req.session.csrfToken = csrfToken;
        var redirectUrl = req.protocol + '://' + req.get('host') + '/redeem-popup';

        // set up the TokenRequest
        var tokenRequest = Token.createTransferTokenRequest(form.amount, form.currency)
            .setDescription(form.description)
            .setToAlias(alias)
            .setToMemberId(member.memberId())
            .addDestination(destination)
            .setRedirectUrl(redirectUrl)
            .setCSRFToken(csrfToken)
            .setRefId(refId)
            .setSource(source)
            .setBankId(bankId)
            .addTransferDestination(transferDestination);
        console.log(JSON.stringify(tokenRequest))
        // store the token request
        var request = await member.storeTokenRequest(tokenRequest);
        var requestId = request.id;
        var tokenRequestUrl = Token.generateTokenRequestUrl(requestId);
        tokenRequestUrl += "dk=smartym";
        res.status(200).send(tokenRequestUrl);
    });

     // Endpoint for transferring, called by client side after user approval
     app.get('/cross-border', async function (req, res) {
        var destination = {
            sepa: {
                iban: 'bic',
                bic: 'DE16700222000072880129'
            },
            customerData: {
                legalNames: ['merchant-sample-js']
            }
        };

        var queryData = req.query;
        var refId = Token.Util.generateNonce();
        var csrfToken = Token.Util.generateNonce();
        req.session.csrfToken = csrfToken;
        var redirectUrl = req.protocol + '://' + req.get('host') + '/redeem';

        // set up the TokenRequest
        var tokenRequest = Token.createTransferTokenRequest(queryData.amount, queryData.currency)
            .setDescription(queryData.description)
            .setToAlias(alias)
            .setToMemberId(member.memberId())
            .addTransferDestination(destination)
            .setRedirectUrl(redirectUrl)
            .setCSRFToken(csrfToken)
            .setRefId(refId);

        // store the token request
        var request = await member.storeTokenRequest(tokenRequest)
        var requestId = request.id;
        var tokenRequestUrl = Token.generateTokenRequestUrl(requestId);
        res.redirect(302, tokenRequestUrl);
    });

    // Endpoint for transferring, called by client side after user approval
    app.post('/cross-border-popup', urlencodedParser, async function (req, res) {
        var destination = {
            sepa: {
                iban: 'bic',
                bic: 'DE16700222000072880129'
            },
            customerData: {
                legalNames: ['merchant-sample-js']
            }
        };

        var form = req.body;
        var refId = Token.Util.generateNonce();
        var csrfToken = Token.Util.generateNonce();
        req.session.csrfToken = csrfToken;
        var redirectUrl = req.protocol + '://' + req.get('host') + '/redeem-popup';

        // set up the TokenRequest
        var tokenRequest = Token.createTransferTokenRequest(form.amount, form.currency)
            .setDescription(form.description)
            .setToAlias(alias)
            .setToMemberId(member.memberId())
            .setSetTransferDestinationsUrl('http://localhost:3000/callback')
            .setRedirectUrl(redirectUrl)
            .setCSRFToken(csrfToken);

        // store the token request
        var request = await member.storeTokenRequest(tokenRequest);
        var requestId = request.id;
        tokenRequestId = request.id;
        const d = "http://localhost:5000/app/request-token/" + requestId;
        console.log('d', d)
        var tokenRequestUrl = Token.generateTokenRequestUrl(requestId);
        res.status(200).send(tokenRequestUrl);
    });

    // for redirect flow, use Token.parseTokenRequestCallbackUrl()
    app.get('/redeem', urlencodedParser, async function (req, res) {
        //get the token ID from the callback url
        var callbackUrl = req.protocol + '://' + req.get('host') + req.originalUrl;
        var result = await Token.parseTokenRequestCallbackUrl(callbackUrl, req.session.csrfToken);
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
        var result = await Token.parseTokenRequestCallbackParams(JSON.parse(data), req.session.csrfToken);
        var token = await member.getToken(result.tokenId);
        //Redeem the token to move the funds
        var transfer = await member.redeemToken(token);
        console.log('\n Redeem Token Response:', transfer);
        res.status(200);
        res.send('Success! Redeemed transfer ' + transfer.id);
    });

    app.get('/redeem-standing-order', urlencodedParser, async function (req, res) {
        //get the token ID from the callback url
        var callbackUrl = req.protocol + '://' + req.get('host') + req.originalUrl;
        var result = await Token.parseTokenRequestCallbackUrl(callbackUrl, req.session.csrfToken);

        var standingOrderSubmission = await member.redeemStandingOrderToken(result.tokenId);

        console.log('\n Redeem Token Response:', JSON.stringify(standingOrderSubmission));
        res.status(200);
        res.send('Success! Redeemed transfer ' + standingOrderSubmission.tokenId);
    });

    app.get('/redeem-standing-order-popup', urlencodedParser, async function (req, res) {
        //get the token ID from the callback url
        debugger;
        var data = req.query.data;
        var result = await Token.parseTokenRequestCallbackParams(JSON.parse(data), req.session.csrfToken);

        var standingOrderSubmission = await member.redeemStandingOrderToken(result.tokenId);

        console.log('\n Redeem Token Response:', JSON.stringify(standingOrderSubmission));
        res.status(200);
        res.send('Success! Redeemed transfer ' + standingOrderSubmission.tokenId);
    });

    app.get('/redeem-future-dated', urlencodedParser, async function (req, res) {
        //get the token ID from the callback url
        var callbackUrl = req.protocol + '://' + req.get('host') + req.originalUrl;
        var result = await Token.parseTokenRequestCallbackUrl(callbackUrl, req.session.csrfToken);

        var token = await member.getToken(result.tokenId);

        //Redeem the token to move the funds
        var transfer = await member.redeemToken(token);

        console.log('\n Redeem Token Response:', JSON.stringify(transfer));
        res.status(200);
        res.send('Success! Redeemed transfer ' + transfer.id);
    });

    app.get('/redeem-future-dated-popup', urlencodedParser, async function (req, res) {
        //get the token ID from the callback url
        var data = req.query.data;
        var result = await Token.parseTokenRequestCallbackParams(JSON.parse(data), req.session.csrfToken);
        var token = await member.getToken(result.tokenId);
        //Redeem the token to move the funds
        var transfer = await member.redeemToken(token);
        console.log('\n Redeem Token Response:', transfer);
        res.status(200);
        res.send('Success! Redeemed transfer ' + transfer.id);
    });

    app.get('/redeem-standing-order', urlencodedParser, async function (req, res) {
        //get the token ID from the callback url
        var callbackUrl = req.protocol + '://' + req.get('host') + req.originalUrl;
        var result = await Token.parseTokenRequestCallbackUrl(callbackUrl, req.session.csrfToken);

        var standingOrderSubmission = await member.redeemStandingOrderToken(result.tokenId);

        console.log('\n Redeem Token Response:', JSON.stringify(standingOrderSubmission));
        res.status(200);
        res.send('Success! Redeemed transfer ' + standingOrderSubmission.tokenId);
    });

    app.get('/redeem-standing-order-popup', urlencodedParser, async function (req, res) {
        //get the token ID from the callback url
        debugger;
        var data = req.query.data;
        var result = await Token.parseTokenRequestCallbackParams(JSON.parse(data), req.session.csrfToken);

        var standingOrderSubmission = await member.redeemStandingOrderToken(result.tokenId);

        console.log('\n Redeem Token Response:', JSON.stringify(standingOrderSubmission));
        res.status(200);
        res.send('Success! Redeemed transfer ' + standingOrderSubmission.tokenId);
    });

    app.get('/callback', urlencodedParser, async function (req, res){
        var redirectUrl = req.protocol + '://' + req.get('host') + req.url;
        var queryData = Token.parseSetTransferDestinationsUrl(redirectUrl);
        if (queryData.supportedTransferDestinationTypes && queryData.supportedTransferDestinationTypes.includes('SEPA')) {
            var destination = [
                {
                    sepa: {
                        iban: 'DE16700222000072880129',
                        bic: '123456'
                    }
                }
            ];
            await member.setTokenRequestTransferDestinations(tokenRequestId, destination);
            res.header("Access-Control-Allow-Origin", "http://localhost:5000");
            res.sendStatus(200);
        } else {
            res.header("Access-Control-Allow-Origin", "http://localhost:5000");
            res.sendStatus(400);
        }        
    });

    app.use(express.static(__dirname));
    app.listen(3000, function () {
        console.log('Example app listening on port 3000!')
    })
}

init();
