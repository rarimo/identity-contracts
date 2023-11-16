// SPDX-License-Identifier: MIT
pragma solidity 0.8.16;

import {ISBTIdentityVerifier} from "../interfaces/verifiers/ISBTIdentityVerifier.sol";
import {IZKPQueriesStorage} from "../interfaces/IZKPQueriesStorage.sol";
import {ILightweightState} from "../interfaces/ILightweightState.sol";
import {IQueryValidator} from "../interfaces/IQueryValidator.sol";
import {IVerifiedSBT} from "../interfaces/tokens/IVerifiedSBT.sol";

import {BaseVerifier} from "./BaseVerifier.sol";

contract SBTIdentityVerifier is ISBTIdentityVerifier, BaseVerifier {
    string public constant SBT_IDENTITY_PROOF_QUERY_ID = "SBT_IDENTITY_PROOF";

    address public sbtToken;

    mapping(address => uint256) public override addressToIdentityId;

    mapping(uint256 => SBTIdentityProofInfo) internal _identitiesProofInfo;

    function __SBTIdentityVerifier_init(
        IZKPQueriesStorage zkpQueriesStorage_,
        address sbtToken_
    ) external initializer {
        __BaseVerifier_init(zkpQueriesStorage_);

        sbtToken = sbtToken_;
    }

    function proveIdentity(ProveIdentityParams calldata proveIdentityParams_) external override {
        _proveIdentity(proveIdentityParams_);
    }

    function transitStateAndProveIdentity(
        ProveIdentityParams calldata proveIdentityParams_,
        TransitStateParams calldata transitStateParams_
    ) external override {
        _transitState(transitStateParams_);
        _proveIdentity(proveIdentityParams_);
    }

    function getIdentityProofInfo(
        uint256 identityId_
    ) external view override returns (SBTIdentityProofInfo memory) {
        return _identitiesProofInfo[identityId_];
    }

    function isIdentityProved(address userAddr_) external view override returns (bool) {
        return isIdentityProved(addressToIdentityId[userAddr_]);
    }

    function isIdentityProved(uint256 identityId_) public view virtual override returns (bool) {
        return _identitiesProofInfo[identityId_].isProved;
    }

    function _proveIdentity(ProveIdentityParams calldata proveIdentityParams_) internal virtual {
        _verify(SBT_IDENTITY_PROOF_QUERY_ID, proveIdentityParams_);

        require(
            addressToIdentityId[msg.sender] == 0,
            "IdentityVerifier: Msg sender address has already been used to prove the another identity."
        );

        IQueryValidator queryValidator_ = IQueryValidator(
            zkpQueriesStorage.getQueryValidator(SBT_IDENTITY_PROOF_QUERY_ID)
        );

        uint256 identityId_ = proveIdentityParams_.inputs[queryValidator_.getUserIdIndex()];

        require(
            !isIdentityProved(identityId_),
            "IdentityVerifier: Identity has already been proven."
        );

        uint256 newTokenId_ = IVerifiedSBT(sbtToken).nextTokenId();
        IVerifiedSBT(sbtToken).mint(msg.sender);

        addressToIdentityId[msg.sender] = identityId_;
        _identitiesProofInfo[identityId_] = SBTIdentityProofInfo(msg.sender, newTokenId_, true);

        emit SBTIdentityProved(identityId_, msg.sender, sbtToken, newTokenId_);
    }
}
