const VoteProxyFactory = artifacts.require('VoteProxyFactory');
const PollingEmitter = artifacts.require('PollingEmitter');
const VoteProxy = artifacts.require('VoteProxy');
const DSChief = artifacts.require('DSChief');
const DSToken = artifacts.require('DSToken');
const truffleAssert = require('truffle-assertions');

contract('VoteProxyFactory', (accounts) => {
  const symbolMKR = "0x4d4b52" // 'MKR'
  const symbolIOU = "0x494f55" // 'IOU'

  const coldKey = accounts[2];
  const hotKey = accounts[3];

  const maxSlateSize = 2;
  const noAddress = '0x0000000000000000000000000000000000000000';

  let mkr;
  let iou;
  let chief;
  let proxyFactory;
  let polling;

  beforeEach(async () => {
    mkr = await DSToken.new(symbolMKR);
    iou = await DSToken.new(symbolIOU);
    chief = await DSChief.new(mkr.address, iou.address, maxSlateSize);
    polling = await PollingEmitter.new();
    proxyFactory = await VoteProxyFactory.new();
  });

  it('should store the contract address in a mapping', async () => {
    await proxyFactory.newProxy(polling.address, chief.address, coldKey, { from: hotKey });
    const proxy = await proxyFactory.proxies.call(hotKey);
    assert.notEqual(proxy, noAddress);
  });

  it('should generate only one proxy per hot key', async () => {
    await proxyFactory.newProxy(polling.address, chief.address, coldKey, { from: hotKey });

    await truffleAssert.reverts(
      proxyFactory.newProxy(polling.address, chief.address, coldKey, { from: hotKey })
    );
  });

  it('should generate multiple proxies for different hot keys', async () => {
    await proxyFactory.newProxy(polling.address, chief.address, coldKey, { from: hotKey });
    await proxyFactory.newProxy(polling.address, chief.address, coldKey, { from: accounts[4] });
    await proxyFactory.newProxy(polling.address, chief.address, coldKey, { from: accounts[5] });
    await proxyFactory.newProxy(polling.address, chief.address, coldKey, { from: accounts[6] });
  });

  context('mapping', () => {
    let proxyAddress;
    let proxy;

    beforeEach(async () => {
      await proxyFactory.newProxy(polling.address, chief.address, coldKey, { from: hotKey });
      proxyAddress = await proxyFactory.proxies.call(hotKey);
      proxy = await VoteProxy.at(proxyAddress);
    });

    it('should have a hot key that equals the original sender', async () => {
      assert.equal(hotKey, await proxy.hot.call());
    });

    it('should have the correct chief address', async () => {
      assert.equal(chief.address, await proxy.chief.call());
    });

    it('should have the correct cold key', async () => {
      assert.equal(coldKey, await proxy.cold.call());
    });

    it('should be a valid VoteProxy contract with a lock() function', async () => {
      // Mint/send MKR to test with
      const fundSource = accounts[0];
      const deposit = 999;
      await mkr.mint(deposit);
      await mkr.push(proxyAddress, deposit, {from: fundSource});
      await iou.setOwner(chief.address);
      await mkr.setOwner(chief.address);

      // Lock into chief
      await proxy.lock({from: hotKey});

      // Verify the result
      chiefMkrBalance = (await mkr.balanceOf.call(chief.address)).toNumber();
      assert.equal(deposit, chiefMkrBalance);
    });
  });
});