## Token Merchant Checkout Sample

This sample app shows how to integrate the Token Merchant Quick Checkout
button into a merchant's website.
You can learn more about the Quick Checkout flow and relevant APIs at the
[Merchant Quick Checkout](http://developer-beta.token.io/merchant-checkout/)
documentation.

### Setup

To install:

`npm install`

To create a member:

Type `node` and enter the following commands, replacing the username and key dir with your own.

* `var TokenLib = require("token-io/dist/token-io.node.js");`
* `var Token = new TokenLib('sandbox', './keys');`
* `var alias = {type: 'USERNAME', value: 'mariano876'};`
* `Token.createMember(alias, Token.UnsecuredFileCryptoEngine)`

To run the server:

1. Change the username to the one used above, index.html

2. Change the memberId in server.js to the filename in the your keys directory, replacing the underscores _ with colons :

3. run `node server.js`

4. Test by going to localhost:3000, and paying with the "Token PSD2" app, installed from the App Store

### Troubleshooting

If anything goes wrong, try to update the token SDK dependency:

`npm update token-io`

Otherwise, email Token support: support@token.io, or one of the Token engineers.
