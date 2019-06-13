const VoteProxy = artifacts.require("VoteProxy");
const DSToken = artifacts.require("DSToken");
const DSChief = artifacts.require("DSChief");
const symbolMKR = "0x4d4b52";
const symbolIOU = "0x494f55";

module.exports = async function(deployer, network, accounts) {
  const maxSlateSize = 5;
  const mkr = await DSToken.new(symbolMKR);
  const iou = await DSToken.new(symbolIOU);
  const chief = await DSChief.new(mkr.address, iou.address, maxSlateSize);
  VoteProxy.new(chief.address, accounts[0], accounts[1]);
};
