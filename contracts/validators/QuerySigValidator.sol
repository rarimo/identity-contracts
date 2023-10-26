// SPDX-License-Identifier: MIT
pragma solidity 0.8.16;

import {QueryValidator} from "./QueryValidator.sol";

contract QuerySigValidator is QueryValidator {
    string internal constant CIRCUIT_ID = "credentialAtomicQuerySigV2OnChain";
    uint256 internal constant USER_ID_INDEX = 1;
    uint256 internal constant CHALLENGE_INDEX = 5;

    function __QuerySigValidator_init(
        address verifierContractAddr_,
        address stateContractAddr_,
        uint256 identitesStatesUpdateTime_
    ) public initializer {
        __QueryValidator_init(
            verifierContractAddr_,
            stateContractAddr_,
            identitesStatesUpdateTime_
        );
    }

    function getCircuitId() external pure override returns (string memory id) {
        return CIRCUIT_ID;
    }

    function getUserIdIndex() external pure override returns (uint256) {
        return USER_ID_INDEX;
    }

    function getChallengeInputIndex() external pure override returns (uint256 index) {
        return CHALLENGE_INDEX;
    }

    function _getInputValidationParameters(
        uint256[] calldata inputs_
    ) internal pure override returns (ValidationParams memory) {
        return ValidationParams(inputs_[2], inputs_[6], inputs_[7], inputs_[3], inputs_[9]);
    }
}
