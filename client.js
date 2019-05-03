'use strict';

// Client side Token object for creating the Token button, handling the Token Controller, etc
var token = new window.Token({
    env: 'sandbox',
});

// set up a function using the item data to populate the request to fetch the TokenRequestFunction
function getTokenRequestUrl(done) {
    fetch('http://localhost:3000/transfer', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json; charset=utf-8',
        },
        body: JSON.stringify({
            merchantId: 'Merchant 123',
            amount: 4.99,
            currency: 'GBP',
            description: 'Book Purchase',
            destination: {
                account: {fasterPayments: {sortCode: '123456', accountNumber: '12345678'}},
            },
        }),
    })
    .then(function(response) {
        if (response.ok) {
            response.text()
                .then(function(data) {
                    // execute callback when successful response is received
                    done(data);
                    console.log('data: ', data);
                });
        }
    });
}

function createButton() {
    // get button placeholder element
    var element = document.getElementById('tokenPayBtn');

    // create the button
    var button = token.createTokenButton(element, {
        label: 'Token Quick Checkout',
    });

    // create TokenController to handle messages
    var tokenController = token.createController({
        onSuccess: function(data) { // Success Callback
            // build success URL
            var successURL = `/redeem?data=${window.encodeURIComponent(JSON.stringify(data))}`;
            // navigate to success URL
            window.location.assign(successURL);
        },
        onError: function(error) { // Failure Callback
            throw error;
        },
    });

    // bind the Token Button to the Token Controller when ready
    tokenController.bindButtonClick(
        button,
        getTokenRequestUrl,
        function(error) {
            // enable button after binding
            if (error) throw error;
            button.enable();
        }
    );
}

createButton();
