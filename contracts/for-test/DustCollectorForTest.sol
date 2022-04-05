// SPDX-License-Identifier: MIT
pragma solidity >=0.8.4 <0.9.0;

import '../peripherals/DustCollector.sol';

contract DustCollectorForTest is DustCollector {
  constructor() DustCollector() Keep3rGovernance(msg.sender) {}
}
