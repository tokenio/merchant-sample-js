"use strict";
var tokenController;
var button;
var data = {
    amount: 4.99,
    currency: 'EUR',
    description: 'Book Purchase',
};

function clean() {
    if (button) {
        button.destroy();
        button = null;
    }

    if (tokenController && tokenController.destroy) {
        tokenController.destroy();
        tokenController = null;
    }
}

function tokenRequestPath() {
    return '/transfer';
}

function redeemTokenPath() {
    return '/redeem';
}

function setupButtonTypeSelector() {
    var modeSelector = document.getElementsByName('buttonTypeSelector');
    var selectedMode = modeSelector[0].value;

    for (var i = 0; i < modeSelector.length; i++) {
        modeSelector[i].addEventListener('click', function (e) {
            var value = e.target.value;
            if (value === selectedMode) return;
            selectedMode = value;
            createTokenRequestButton(selectedMode)
        });
    }
    createTokenRequestButton(selectedMode);
}

function createTokenRequestButton(selectedMode) {
    if (selectedMode === 'MODAL') {
        createTokenButton('MODAL')
    } else if (selectedMode === 'REDIRECT') {
        createTokenButton('REDIRECT');
    } else if (selectedMode === 'IFRAME') {
        createTokenButton('IFRAME')
    }
}

function createTokenButton(type) {
    // Client side Token object for creating the Token button, handling the Token Controller, etc
    var token = new window.TokenApp({
        env: 'sandbox',
    });

    tokenController = token.buildController({
        onSuccess: function (data) { // Success Callback
            // build success URL
            var successURL = `${redeemTokenPath()}?data=${window.encodeURIComponent(JSON.stringify(data))}`;
            // navigate to success URL
            window.location.assign(successURL);
        },
        onError: function (error) { // Failure Callback
            clean();
            throw error;
        },
    });

    // get button placeholder element
    var element = document.getElementById('tokenModalBtn');
    var webAppIframeEl = document.getElementById('webapp-iframe');

    var path = tokenRequestPath();

    element.onclick = async function () {
        var tokenRequestUrl = await sendRequest(path, data);
        if (type === 'REDIRECT') {
            window.location.assign(tokenRequestUrl);
        } else if (type === 'IFRAME') {
            tokenController.initAppIframe({ appUrl: tokenRequestUrl, parentEl: webAppIframeEl });
        } else {
            tokenController.initApp({ appUrl: tokenRequestUrl });
        }
    };
}

async function sendRequest(path, data) {
    var response = await fetch(path, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json; charset=utf-8',
        },
        body: JSON.stringify(data),
    });
    if (response.ok) {
        return response.text();
    }
}

setupButtonTypeSelector();
