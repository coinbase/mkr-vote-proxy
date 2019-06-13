pragma solidity >=0.5.0;

import "./VoteProxy.sol";
import "ds-chief/chief.sol";

/// @dev Deploys VoteProxy smart contracts and tracks the address of the proxies that have been deployed
contract VoteProxyFactory {

  /// @dev Maps a hot key to the address of the VoteProxy contract that hot key controls
  mapping(address => VoteProxy) public proxies;

  /// @dev Creates a new vote proxy contract. The address calling this function is used as the "hot" key
  /// for the vote proxy contract that is created. Note that a hot key can only be used to create
  /// a single vote proxy contract with an instance of VoteProxyFactory. Subsequent calls to newProxy with
  /// same hot key will fail.
  /// @param _chief The address of a DSChief voting contract with which the proxy interacts
  /// @param _cold  The address of a "cold key"; funds are returned to this key only upon release().
  /// used to interact with this contract. This key is stored in the proxies mapping.
  /// @return the address of the vote proxy contract that was created. This is address is also
  /// stored in the mapping.
  function newProxy(DSChief _chief, address _cold) public returns (VoteProxy proxy) {
    // Only one vote proxy is permitted per originating key
    require(address(proxies[msg.sender]) == address(0), "Duplicate hot key not permitted");

    // Create the proxy, store the mapping, and return the address of the new proxy
    proxy = new VoteProxy(_chief, _cold, msg.sender);
    proxies[msg.sender] = proxy;
    return proxy;
  }
}