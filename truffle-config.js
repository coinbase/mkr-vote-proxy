const HDWalletProvider = require('@truffle/hdwallet-provider');
require('dotenv').config();

module.exports = {
  networks: {
    development: {
      host: "localhost",
      port: 7545,
      network_id: "*",
    },
    ropsten: {
      provider: () => new HDWalletProvider(process.env.MNEMONIC,
        'https://ropsten.infura.io/v3/' + process.env.INFURA_API_KEY),
      network_id: 3,
      from: process.env.ADDRESS,
    },
    kovan: {
      provider: () => new HDWalletProvider(process.env.MNEMONIC,
        'https://kovan.infura.io/v3/' + process.env.INFURA_API_KEY),
      network_id: 42,
      from: process.env.ADDRESS,
    },
    mainnet: {
      provider: function() {
        return new HDWalletProvider(process.env.MNEMONIC,
        'https://mainnet.infura.io/v3/' + process.env.INFURA_API_KEY)
      },
      network_id: 1,
      gasPrice: 4000000000,
      gas: 4000000,
      from: process.env.ADDRESS,
    },
    coverage: {
      host: 'localhost',
      network_id: '*',
      port: 8555,
      gas: 0xfffffffffff,
      gasPrice: 0x01,
    },
  },
  compilers: {
    solc: {
      version: '0.5.0',
      settings: {
        optimizer: {
          enabled: true,
          runs: 200
        },
      }
    }
  }
};
