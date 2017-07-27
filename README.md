## Token Merchant Checkout Sample

To install:

`npm install`

To create a member:

Type `node` and enter the following commands, replacing the username and key dir with your own.

* `var TokenLib = require("token-io/dist/token-io.node.js");`
* `var Token = new TokenLib('sbx', './keys');`
* `Token.createMember('marianoTest5', Token.UnsecuredFileCryptoEngine)`

To run the server:

1. Change the username to the one used above, index.html

2. Change the memberId in server.js to the filename in the your keys directory, replacing the underscores _ with colons :

3. run `node server.js`

4. Test by going to localhost:3000, and paying with the "Token PSD2" app, installed from the App Store
