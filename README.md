# MKR Vote Proxy
These smart contracts (`VoteProxy`, `VoteProxyFactory`) are designed to permit token
holders to vote MKR tokens while ensuring those tokens continue to have the security
of private keys held in cold storage.

### MKR voting
MKR holders vote by depositing MKR into a voting contract designated by MakerDao.
This contract, DSChief [src](https://github.com/dapphub/ds-chief/blob/master/src/chief.sol),
receives MKR deposits and permits the depositor to cast votes based on the number
of tokens deposited. Depositors can release their tokens at any time (and their votes
are removed as well).

### Vote with hot key, funds to cold key
The VoteProxy contract permits tokens holders to vote securely without having keys
associated with the MKR token online (hot storage). When a VoteProxy contract
is created, it is associated with two keys: a hot and cold key. (The cold, private
key can be stored offline.)

MKR holders deposit funds into the VoteProxy, use the
hot key to transfer tokens to the MakerDao voting contract (DSChief), and cast
votes using the hot key. The hot key can also be used to release MKR from the DSChief
and the VoteProxy. MKR can only be released to the cold storage address--they cannot
be transferred to any other address.

This project has two contracts:
* VoteProxy: lock/vote funds with a DSChief contract. Controlled by a hot key. Release
  funds only to a cold storage address.
* VoteProxyFactory: originates a VoteProxy contracts with a smart contract function call.
  Tracks the mapping of hot keys>VoteProxies and enforces a 1:1 mapping of hot key to
  proxy contracts.

## Resources

* MakerDao voting issues: https://vote.makerdao.com/
* MakerDao voting contract: https://chief.makerdao.com/

## Quickstart
```
# Install node dependencies
npm install

# Start ganache in another terminal
npm run dev-blockchain

# Build contracts
npx truffle compile

# Deploy contracts
npx truffle migrate --reset

# Run tests
npm test
```

## Deploy to a testnet/mainnet
Create a `.env` file in the project root directory with your
Infura API key and Metamask account mnemonic
```
MNEMONIC="your twelve words go here ...."
INFURA_API_KEY=<base64 API key>
ADDRESS=<HEX address of your Metamask account>
```

Deploy to Ropsten
```
npx truffle migrate --network ropsten
```

Deploy to Kovan
```
npx truffle migrate --network kovan
```

Deploy to ethereum mainnet
```
npx truffle migrate --network mainnet
```

## License
This project is available open source under the terms of the [Apache 2.0 License](https://opensource.org/licenses/Apache-2.0).
