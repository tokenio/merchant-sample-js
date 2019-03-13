## Token Merchant Checkout Sample: Javascript

This sample app shows how to integrate the Token Merchant Quick Checkout
button into a merchant's website.
You can learn more about the checkout buttons and relevant APIs at
[Token Request](https://developer.token.io/token-request/?javascript#2-redirect-to-tokenos-to-obtain-authorization).

### Setup

To install, `npm install`

To run, `node server.js`

This starts up a server.

The first time you run the server, it creates a new Member (Token user account).
It saves the Member's private keys in the `keys` directory.
In subsequent runs, the server uses this ID these keys to log the Member in.

The server operates in Token's Sandbox environment. This testing environment
lets you try out UI and payment flows without moving real money.

The server shows a web page at `localhost:3000`. The page has a checkout button.
Clicking the button starts the Token merchant payment flow.
The server handles endorsed payments by redeeming tokens.

Test by going to `localhost:3000`.
You can't get far until you create a customer member as described at
[Token Request](https://developer.token.io/token-request/).

This code uses a publicly-known developer key (the devKey line in the
initializeSDK method). This normally works, but don't be surprised if
it's sometimes rate-limited or disabled. If your organization will do
more Token development and doesn't already have a developer key, contact
Token to get one.

### Troubleshooting

If anything goes wrong, try to update the token SDK dependency:

`npm update @token-io/tpp`

Otherwise, email Token support: support@token.io, or one of the Token engineers.
