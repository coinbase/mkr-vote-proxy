const VoteProxy = artifacts.require("VoteProxy");
const DSChief = artifacts.require("DSChief");
const DSChiefFab = artifacts.require("DSChiefFab");
const DSToken = artifacts.require("DSToken");
const contractAssert = require('truffle-assertions');

contract('VoteProxy', function(accounts) {
  const symbolMKR = "0x4d4b52" // 'MKR'
  const symbolIOU = "0x494f55" // 'IOU'

  const fundSource = accounts[2];
  const hotKey = accounts[3];
  const coldKey = accounts[4];
  const otherKey = accounts[5];

  const maxSlateSize = 5;
  const mkrSupply = 31415926535;

  // Voting issue of the millenium: LEAF vs STRAY
  const leafOne = '0x0123456789012345678901234567890123456789';
  const leafTwo = '0x04e32CCb8981C033340E1eB059ef848913A49B1a';
  const leafThree = '0x3214563214563214563214563214556321456321';
  const leafFour = '0xB1bBc50Ba225125a71eDf60f66A915b84AB3D512';
  const leafFive = '0xd7621e25337EBDE3bc227Afe04a4736004911cC1';
  const leafSix = '0xf088bCf3624F7a837F16Fd33d9BE3Be39d5C9e57';

  const leafAddressList = [leafOne, leafThree];

  const strayAddressList = [
    '0x0000444444444444444444444400004444444444',
    '0x8888888888888888888888888888888888888888'
  ]

  let leafSlate;
  let straySlate;

  let mkr;
  let iou;
  let chief;
  let proxy;

  // Fetch balance for a given token
  async function tokenBalance(token, address) {
    balance = await token.balanceOf.call(address);
    return balance.toNumber();
  }

  // Check the MKR balance of any address
  mkrBalance = async (address) => {
    return tokenBalance(mkr, address);
  }

  // Check the IOU balance of any address
  iouBalance = async (address) => {
    return tokenBalance(iou, address);
  }

 // Get the number of approvals cast for a given address
  approvals = async (address) => {
    return (await chief.approvals.call(address)).toNumber();
  };

  // Asserts that all addresses in the list have the expected
  // number of approvals in the chief.appovals mapping.
  assertApprovalsEqual = async (expectedApprovals, addresses) => {
    addresses.forEach(async (addr) => {
      assert.equal(expectedApprovals, await approvals(addr));
    });
  };

  // Establish each of contracts and issue an initial supply of
  // MKR that we can use for deposits
  beforeEach(async () => {
    mkr = await DSToken.new(symbolMKR);
    iou = await DSToken.new(symbolIOU);
    chief = await DSChief.new(mkr.address, iou.address, maxSlateSize);

    // Mint some MKR before we hand off control to the Chief
    await mkr.mint(fundSource, mkrSupply);
    await iou.setOwner(chief.address);
    await mkr.setOwner(chief.address);
    proxy = await VoteProxy.new(chief.address, coldKey, hotKey);

    // Etch LEAF and Stray and set the slates.
    await chief.etch(leafAddressList);
    await chief.etch(strayAddressList);

    leafSlate = await chief.etch.call(leafAddressList);
    straySlate = await chief.etch.call(strayAddressList);
  });

  context('Checking permissions', async () => {
    beforeEach(async () => {
      // Deposit to vote proxy
      const deposit = mkrSupply-100;
      await mkr.push(proxy.address, deposit, {from: fundSource});
    });

    // Calls each public function on VoteProxy. No asserts, just
    // expecting no errors. Behavior of individual functions tested
    // elsehwhere.
    publicFunctionsPermitted = async (controlKey) => {
      it("can call lock", async () => {
        await proxy.lock({from: controlKey});
      });

      it("can call voteAddresses", async () => {
        await proxy.voteAddresses(strayAddressList, {from: controlKey});
      });

      it("can call release()", async () => {
        await proxy.release({from: controlKey});
      });
    };

    // Calls each public function and expects a revert.
    publicFunctionsDenied = async (controlKey) => {
      it("cannot call lock", async () => {
        await contractAssert.reverts(
          proxy.lock({from: controlKey}));
      });

      it("cannot call voteAddresses", async () => {
        await contractAssert.reverts(
          proxy.voteAddresses(strayAddressList, {from: controlKey}));
      });

      it("cannot call release()", async () => {
        await contractAssert.reverts(
          proxy.release({from: controlKey}));
      });
    };

    // Expecting no errors
    context('cold key as control key',
      async () => { publicFunctionsPermitted(coldKey)});
    context('hot key as control key',
      async () => { publicFunctionsPermitted(hotKey)});

    // Expecting failures
    context('arbitrary key as control key',
       async () => { publicFunctionsDenied(otherKey)});
    context('originating key as control key',
       async () => { publicFunctionsDenied(accounts[0])});
  });

  context('lock() deposits all funds in chief', async () => {
    const deposit = 5432;

    beforeEach(async () => {
      // Deposit to vote proxy and lock into chief
      await mkr.push(proxy.address, deposit, {from: fundSource});
      await proxy.lock({from: hotKey});
    });

    it("should leave no funds in VoteProxy", async () => {
      assert.equal(0, await mkrBalance(proxy.address));
    });

    it("should deposit all funds in Chief", async () => {
      assert.equal(deposit, await mkrBalance(chief.address));
    });

    it("should increase votes after vote/deposit/lock", async () => {
      // Vote
      await proxy.voteAddresses(strayAddressList, {from: hotKey});

      // Deposit
      await mkr.push(proxy.address, deposit, {from: fundSource});

      // Lock
      await proxy.lock({from: hotKey});

      // Expects votes to be increased automatically
      assertApprovalsEqual(2*deposit, strayAddressList);
    });

    it("should not call lock() on chief if there's no balance", async () => {
      // lock() with no funds
      const lockNoFunds = await proxy.lock({from: hotKey});

      // Deposit and lock again
      await mkr.push(proxy.address, deposit, {from: fundSource});
      const lockFunds = await proxy.lock({from: hotKey});

      // Expect less gas for lock()ing without funds
      assert(lockNoFunds.receipt.gasUsed < lockFunds.receipt.gasUsed);
    });
  });

  context("should issue IOUs", async () => {
    const deposit = 4242;
    const controlKey = coldKey;

    beforeEach(async () => {
      await mkr.push(proxy.address, deposit, {from: fundSource});
    });

    // Check the number of IOUs in the proxy contract
    async function assertIouBalance(expectedIous) {
      assert.equal(expectedIous, await iouBalance(proxy.address));
    }

    it("should have IOUs after lock", async () => {
      await proxy.lock({from: controlKey});
      await assertIouBalance(deposit);
    });

    it("should have IOUs after vote", async () => {
      await proxy.voteAddresses(strayAddressList, {from: controlKey});
      await assertIouBalance(deposit);
    });

    it("should get additional IOUs after deposit/lock", async () => {
      await proxy.lock({from: controlKey});
      await mkr.push(proxy.address, 1, {from: fundSource});
      await proxy.lock({from: controlKey});
      await assertIouBalance(deposit+1);
    });

    it("should get additional IOUs after deposit/vote", async () => {
      await proxy.lock({from: controlKey});
      await mkr.push(proxy.address, 10, {from: fundSource});
      await proxy.voteAddresses(leafAddressList, {from: controlKey});
      await assertIouBalance(deposit+10);
    });
  });

  context("should return funds to cold storage after deposit",
    async () => {
      const deposit = 1001;
      const controlKey = coldKey;

      beforeEach(async () => {
        await mkr.push(proxy.address, deposit, {from: fundSource});
      });

      async function releaseAndAssertMkrBalance(expectedAmount) {
        // Free funds and verify final balance
        await proxy.release({from: controlKey});
        assert.equal(expectedAmount, await mkrBalance(coldKey));
      }

      it("returns funds after no actions", async () => {
        await releaseAndAssertMkrBalance(deposit);
      });

      it("returns funds after lock", async () => {
        // Lock
        await proxy.lock({from: controlKey});
        await releaseAndAssertMkrBalance(deposit);
      });

      it("returns funds after lock/deposit", async () => {
        // Lock
        await proxy.lock({from: controlKey});

        // Deposit again
        await mkr.push(proxy.address, deposit, {from: fundSource})
        await releaseAndAssertMkrBalance(deposit*2);
      });

      it("returns funds after vote", async () => {
        // Vote
        await proxy.voteAddresses(leafAddressList, {from: controlKey});
        await releaseAndAssertMkrBalance(deposit);
      });

      it("returns funds after vote/deposit", async () => {
        // Vote
        await proxy.voteAddresses(strayAddressList, {from: controlKey});

        // Deposit again
        await mkr.push(proxy.address, deposit, {from: fundSource})
        await releaseAndAssertMkrBalance(deposit*2);
      });

      it("returns funds after vote/change vote", async () => {
        // Vote
        await proxy.voteAddresses(leafAddressList, {from: controlKey});
        await proxy.voteAddresses(strayAddressList, {from: controlKey});
        await releaseAndAssertMkrBalance(deposit);
      });
  });

  context('when handling votes for multiple addresses', async () => {
    const fullSlate = [leafOne, leafTwo, leafThree, leafFour, leafFive];
    const deposit = 9001;
    const controlKey = coldKey;

    beforeEach(async () => {
      await mkr.push(proxy.address, deposit, {from: fundSource});
    });

    it('should let you vote for up to 5 address', async () => {
      const tooFullSlate = [...fullSlate, leafSix];

      await proxy.voteAddresses(fullSlate, {from: controlKey});

      await contractAssert.reverts(
        proxy.voteAddresses(tooFullSlate, {from: controlKey}) 
      );
    });

    it('should count the vote for each address in the list', async () => {
      await proxy.voteAddresses(fullSlate, {from: controlKey});
      await assertApprovalsEqual(deposit, fullSlate);
    })
  });

  context('should register votes with chief', async () => {
      const deposit = 271828;
      const controlKey = hotKey;

      beforeEach(async () => {
        await mkr.push(proxy.address, deposit, {from: fundSource});
      });

      it('registers votes with single vote()', async () => {
        await proxy.voteAddresses(leafAddressList, {from: controlKey});
        assertApprovalsEqual(deposit, leafAddressList);
      });

      it('registers votes after lock/vote', async () => {
        await proxy.lock({from: controlKey});
        await proxy.voteAddresses(leafAddressList, {from: controlKey});
        assertApprovalsEqual(deposit, leafAddressList);
      });

      it('registers votes after change',
        async () => {
        await proxy.voteAddresses(leafAddressList, {from: controlKey});
        await proxy.voteAddresses(strayAddressList, {from: controlKey});
        assertApprovalsEqual(deposit, strayAddressList);
      });

      it('registers no votes for original slate after change',
        async () => {
        await proxy.voteAddresses(leafAddressList, {from: controlKey});
        await proxy.voteAddresses(strayAddressList, {from: controlKey});
        assertApprovalsEqual(0, leafAddressList);
      });

      it('makes no change if re-voting for the same slate',
        async () => {
        await proxy.voteAddresses(strayAddressList, {from: controlKey});
        await proxy.voteAddresses(strayAddressList, {from: controlKey});
        assertApprovalsEqual(deposit, strayAddressList);
      });

      it('permits multiple deposits and re-votes',
        async () => {
        // vote
        await proxy.voteAddresses(strayAddressList, {from: controlKey});

        // Deposit and change
        await mkr.push(proxy.address, deposit, {from: fundSource});
        await proxy.voteAddresses(leafAddressList, {from: controlKey});
        assertApprovalsEqual(2*deposit, leafAddressList);
      });

      it('permits multiple deposits and re-votes for same slate',
        async () => {
        // vote
        await proxy.voteAddresses(leafAddressList, {from: controlKey});

        // Deposit and vote
        await mkr.push(proxy.address, deposit, {from: fundSource});
        await proxy.voteAddresses(leafAddressList, {from: controlKey});
        assertApprovalsEqual(2*deposit, leafAddressList);
      });

      it('registers votes after a large number of deposits',
        async () => {
        const cnt = 100;
        const microDeposit = 100;

        // Large number of deposits
        for (let i=0; i < cnt; ++i) {
          await mkr.push(proxy.address, microDeposit, {from: fundSource});
        }

        // vote
        await proxy.voteAddresses(strayAddressList, {from: controlKey});
        assertApprovalsEqual(cnt*microDeposit+deposit, strayAddressList);
      });

      it('registers votes when voting with address list', async() => {
        await proxy.voteAddresses(leafAddressList, {from: controlKey});
        assertApprovalsEqual(deposit, leafAddressList);
      });
  });
});