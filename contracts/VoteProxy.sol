pragma solidity >=0.5.0;

import "ds-token/token.sol";
import "ds-chief/chief.sol";

/// @dev Vote MKR tokens with a hot key and ensure all assets are returned to a cold key.
/// Expected flow: originate a contract with hot, cold keys; pointed to an active DSChief
/// voting contract. Deposits funds directly in this contract. lock()/vote() those funds
/// as desired using the hot key. release() funds back to the cold key.
contract VoteProxy {
  address public cold;
  address public hot;
  DSToken public gov;
  DSToken public iou;
  DSChief public chief;

  /// @dev Create a new VoteProxy smart contract
  /// @param _chief The address of a DSChief voting contract which which this proxy will interact
  /// @param _cold  The address of a "cold key"; funds are returned to this key only upon release().
  /// As a contingency, this key can also call all public methods on this contract.
  /// @param _hot   The address of a "hot" or admin key. This is the key that is intended to be
  /// used to interact with this contract.
  constructor(DSChief _chief, address _cold, address _hot) public {
    chief = _chief;
    cold = _cold;
    hot = _hot;

    gov = chief.GOV();
    iou = chief.IOU();
    gov.approve(address(chief));
    iou.approve(address(chief));
  }

  /// @dev Only the hot or cold keys established during contract construction can
  /// execute functions on this contract.
  modifier auth() {
    require(msg.sender == hot || msg.sender == cold, "Sender must be a Cold or Hot Wallet");
    _;
  }

  /// @dev Lock all GOV tokens (MKR) that have been deposited into this contract contract into the
  /// chief voting contract.
  function lock() public auth {
    // If a vote was placed previously, it will be automatically
    // credited with additional deposits locked into chief
    if (gov.balanceOf(address(this)) > 0) {
      chief.lock(gov.balanceOf(address(this)));
    }
  }

  /// @dev Return all funds to the cold key. Once this is called, the contract is intended to be
  /// no longer in use (don't deposit funds into this contract after release).
  function release() public auth {
    // Exchange all IOUs for GOV (MKR)
    chief.free(chief.deposits(address(this)));

    // Send all GOV (MKR) to the cold key
    gov.push(cold, gov.balanceOf(address(this)));
  }

  /// @dev Place a vote for the given list of addresses
  /// @param issues A list of contract addresses that represent voting issues or executive functions.
  /// See: https://vote.makerdao.com/ for MakerDao voting issues.
  /// @return The "slate" that identifies this list of issues. A slate is simply a hash of the
  /// array of addresses.
  function voteAddresses(address[] memory issues) public auth returns (bytes32) {
    // Ensure all GOV (MKR) has been locked to the DSChief prior to placing the vote
    lock();
    return chief.vote(issues);
  }
}