// SPDX-License-Identifier: MIT
pragma solidity 0.8.16;

import {ITimeWindowSBTIdentityVerifier} from "../interfaces/verifiers/ITimeWindowSBTIdentityVerifier.sol";
import {ISBTIdentityVerifier} from "../interfaces/verifiers/ISBTIdentityVerifier.sol";
import {IQueryValidator} from "../interfaces/IQueryValidator.sol";
import {ITimeWindowSBT} from "../interfaces/tokens/ITimeWindowSBT.sol";

import {SBTIdentityVerifier} from "./SBTIdentityVerifier.sol";

contract TimeWindowSBTIdentityVerifier is ITimeWindowSBTIdentityVerifier, SBTIdentityVerifier {
    string public constant TIME_WINDOW_SBT_IDENTITY_PROOF_QUERY_ID =
        "TIME_WINDOW_SBT_IDENTITY_PROOF";

    function getTimeWindowSBTIdentityProofInfo(
        uint256 identityId_
    ) external view returns (TimeWindowSBTIdentityProofInfo memory) {
        SBTIdentityProofInfo memory baseSBTIdentityProofInfo_ = _identitiesProofInfo[identityId_];

        return
            TimeWindowSBTIdentityProofInfo(
                baseSBTIdentityProofInfo_,
                ITimeWindowSBT(sbtToken).tokensExpirationTime(baseSBTIdentityProofInfo_.sbtTokenId)
            );
    }

    function isIdentityProved(
        uint256 identityId_
    ) public view override(SBTIdentityVerifier, ISBTIdentityVerifier) returns (bool) {
        uint256 sbtTokenId = _identitiesProofInfo[identityId_].sbtTokenId;

        return
            _identitiesProofInfo[identityId_].isProved &&
            !ITimeWindowSBT(sbtToken).isTokenExpired(sbtTokenId);
    }

    function _proveIdentity(ProveIdentityParams calldata proveIdentityParams_) internal override {
        _verify(TIME_WINDOW_SBT_IDENTITY_PROOF_QUERY_ID, proveIdentityParams_);

        require(
            addressToIdentityId[msg.sender] == 0,
            "TimeWindowSBTIdentityVerifier: Msg sender address has already been used to prove the another identity."
        );

        IQueryValidator queryValidator_ = IQueryValidator(
            zkpQueriesStorage.getQueryValidator(TIME_WINDOW_SBT_IDENTITY_PROOF_QUERY_ID)
        );

        uint256 identityId_ = proveIdentityParams_.inputs[queryValidator_.getUserIdIndex()];

        require(
            !isIdentityProved(identityId_),
            "TimeWindowSBTIdentityVerifier: The user has a valid SBT token"
        );

        ITimeWindowSBT timeWindowSBT_ = ITimeWindowSBT(sbtToken);

        uint256 newTokenId_ = timeWindowSBT_.nextTokenId();
        timeWindowSBT_.mint(msg.sender);

        addressToIdentityId[msg.sender] = identityId_;
        _identitiesProofInfo[identityId_] = SBTIdentityProofInfo(msg.sender, newTokenId_, true);

        emit TimeWindowSBTIdentityProved(
            identityId_,
            msg.sender,
            address(sbtToken),
            newTokenId_,
            timeWindowSBT_.tokensExpirationTime(newTokenId_)
        );
    }
}
