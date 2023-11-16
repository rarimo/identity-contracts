// SPDX-License-Identifier: MIT
pragma solidity 0.8.16;

import {ISBTIdentityVerifier} from "./ISBTIdentityVerifier.sol";
import {ILightweightState} from "../ILightweightState.sol";

interface ITimeWindowSBTIdentityVerifier is ISBTIdentityVerifier {
    struct TimeWindowSBTIdentityProofInfo {
        SBTIdentityProofInfo baseSBTIdentityProofInfo;
        uint256 tokenExpirationTime;
    }

    event TimeWindowSBTIdentityProved(
        uint256 indexed identityId,
        address senderAddr,
        address tokenAddr,
        uint256 tokenID,
        uint256 expirationTime
    );

    function getTimeWindowSBTIdentityProofInfo(
        uint256 identityId_
    ) external view returns (TimeWindowSBTIdentityProofInfo memory);
}
