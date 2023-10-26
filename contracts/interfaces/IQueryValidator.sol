// SPDX-License-Identifier: MIT
pragma solidity 0.8.16;

import {ILightweightState} from "./ILightweightState.sol";

interface IQueryValidator {
    struct ValidationParams {
        uint256 queryHash;
        uint256 gistRoot;
        uint256 issuerId;
        uint256 issuerClaimAuthState;
        uint256 issuerClaimNonRevState;
    }

    function setVerifier(address newVerifier_) external;

    function setIdentitesStatesUpdateTime(uint256 newIdentitesStatesUpdateTime_) external;

    function verify(
        ILightweightState.StatesMerkleData calldata statesMerkleData_,
        uint256[] memory inputs_,
        uint256[2] memory a_,
        uint256[2][2] memory b_,
        uint256[2] memory c_,
        uint256 queryHash_
    ) external view returns (bool);

    function lightweightState() external view returns (ILightweightState);

    function verifier() external view returns (address);

    function identitesStatesUpdateTime() external view returns (uint256);

    function getCircuitId() external pure returns (string memory);

    function getUserIdIndex() external pure returns (uint256);

    function getChallengeInputIndex() external pure returns (uint256);
}
