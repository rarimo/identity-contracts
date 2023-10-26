// SPDX-License-Identifier: MIT
pragma solidity 0.8.16;

import {IBaseVerifier} from "./IBaseVerifier.sol";
import {ILightweightState} from "../ILightweightState.sol";

interface ISBTIdentityVerifier is IBaseVerifier {
    struct SBTIdentityProofInfo {
        address senderAddr;
        uint256 sbtTokenId;
        bool isProved;
    }

    event SBTIdentityProved(
        uint256 indexed identityId,
        address senderAddr,
        address tokenAddr,
        uint256 tokenID
    );

    function proveIdentity(ProveIdentityParams calldata proveIdentityParams_) external;

    function transitStateAndProveIdentity(
        ProveIdentityParams calldata proveIdentityParams_,
        TransitStateParams calldata transitStateParams_
    ) external;

    function addressToIdentityId(address senderAddr_) external view returns (uint256);

    function getIdentityProofInfo(
        uint256 identityId_
    ) external view returns (SBTIdentityProofInfo memory);

    function isIdentityProved(address userAddr_) external view returns (bool);

    function isIdentityProved(uint256 identityId_) external view returns (bool);
}
