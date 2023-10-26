// SPDX-License-Identifier: MIT
pragma solidity 0.8.16;

import {LightweightState} from "../LightweightState.sol";

contract LightweightStateMock is LightweightState {
    function setSigner(address newSigner_) external {
        signer = newSigner_;
    }

    function setSourceStateContract(address newSourceStateContract_) external {
        sourceStateContract = newSourceStateContract_;
    }

    function _authorizeUpgrade(address) internal pure override {}
}
