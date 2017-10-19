## Token Merchant Checkout Sample

This sample app shows how to integrate the Token Merchant Quick Checkout
button into a merchant's website.
You can learn more about the Quick Checkout flow and relevant APIs at the
[Merchant Quick Checkout documentation](http://developer.token.io/merchant-checkout/).

### Setup

To install:

`npm install`

To create a member:

Type `node` and enter the following commands, replacing the email
address and key dir with your own.

```
var TokenLib = require("token-io/dist/token-io.node.js");

var Token = new TokenLib('sandbox','4qY7lqQw8NOl9gng0ZHgT4xdiDqxqoGVutuZwrUYQsI', './keys');

var alias = {type: 'EMAIL', value: 'mariano876@example.com'};

Token.createMember(alias, Token.UnsecuredFileCryptoEngine);
```

To run the server:

1. In server.js, change the email address to the one you used above.
   If you didn't use ./keys as the key dir above, it that in server.js also.

2. run `node server.js`

3. Test by going to localhost:3000.
   You can't get far until you create a customer member as described at the
   [Merchant Quick Checkout documentation](http://developer.token.io/merchant-checkout/).

This code uses a publicly-known developer key (the second parameter to
`new TokenLib`). This normally works, but don't be surprised if
it's sometimes rate-limited or disabled. If your organization will do
more Token development and doesn't already have a developer key, contact
Token to get one.

### Troubleshooting

If anything goes wrong, try to update the token SDK dependency:

`npm update token-io`

Otherwise, email Token support: support@token.io, or one of the Token engineers.
