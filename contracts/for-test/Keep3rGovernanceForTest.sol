// SPDX-License-Identifier: MIT
pragma solidity >=0.8.4 <0.9.0;

import '../peripherals/Keep3rGovernance.sol';

contract Keep3rGovernanceForTest is Keep3rGovernance {
  constructor(address _governance) Keep3rGovernance(_governance) {}
}
