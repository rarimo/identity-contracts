// SPDX-License-Identifier: MIT
pragma solidity 0.8.16;

import {EnumerableSet} from "@openzeppelin/contracts/utils/structs/EnumerableSet.sol";
import {OwnableUpgradeable} from "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import {UUPSUpgradeable} from "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";

import {SetHelper} from "@solarity/solidity-lib/libs/arrays/SetHelper.sol";

import {GenesisUtils} from "@iden3/contracts/lib/GenesisUtils.sol";

import {IBaseVerifier} from "../interfaces/verifiers/IBaseVerifier.sol";
import {IZKPQueriesStorage} from "../interfaces/IZKPQueriesStorage.sol";
import {ILightweightState} from "../interfaces/ILightweightState.sol";
import {IQueryValidator} from "../interfaces/IQueryValidator.sol";

abstract contract BaseVerifier is IBaseVerifier, OwnableUpgradeable, UUPSUpgradeable {
    using EnumerableSet for EnumerableSet.UintSet;
    using SetHelper for EnumerableSet.UintSet;

    IZKPQueriesStorage public zkpQueriesStorage;

    // schema => allowed issuers
    mapping(uint256 => EnumerableSet.UintSet) internal _allowedIssuers;

    function __BaseVerifier_init(IZKPQueriesStorage zkpQueriesStorage_) internal onlyInitializing {
        __Ownable_init();

        _setZKPQueriesStorage(zkpQueriesStorage_);
    }

    function setZKPQueriesStorage(
        IZKPQueriesStorage newZKPQueriesStorage_
    ) external override onlyOwner {
        _setZKPQueriesStorage(newZKPQueriesStorage_);
    }

    function updateAllowedIssuers(
        uint256 schema_,
        uint256[] calldata issuerIds_,
        bool isAdding_
    ) external override onlyOwner {
        _updateAllowedIssuers(schema_, issuerIds_, isAdding_);
    }

    function getAllowedIssuers(uint256 schema_) public view override returns (uint256[] memory) {
        return _allowedIssuers[schema_].values();
    }

    function isAllowedIssuer(
        uint256 schema_,
        uint256 issuerId_
    ) public view virtual override returns (bool) {
        return _allowedIssuers[schema_].contains(issuerId_);
    }

    function _setZKPQueriesStorage(IZKPQueriesStorage newZKPQueriesStorage_) internal {
        zkpQueriesStorage = newZKPQueriesStorage_;
    }

    function _updateAllowedIssuers(
        uint256 schema_,
        uint256[] calldata issuerIds_,
        bool isAdding_
    ) internal {
        if (isAdding_) {
            _allowedIssuers[schema_].add(issuerIds_);
        } else {
            _allowedIssuers[schema_].remove(issuerIds_);
        }
    }

    function _transitState(TransitStateParams calldata transitStateParams_) internal {
        ILightweightState lightweightState_ = zkpQueriesStorage.lightweightState();
        ILightweightState.GistRootData memory currentGISTRootData_ = lightweightState_
            .getCurrentGISTRootInfo();

        if (
            !lightweightState_.isIdentitiesStatesRootExists(
                transitStateParams_.newIdentitiesStatesRoot
            ) &&
            currentGISTRootData_.createdAtTimestamp <
            transitStateParams_.gistData.createdAtTimestamp
        ) {
            lightweightState_.signedTransitState(
                transitStateParams_.newIdentitiesStatesRoot,
                transitStateParams_.gistData,
                transitStateParams_.proof
            );
        }
    }

    function _verify(
        string memory queryId_,
        ProveIdentityParams calldata proveIdentityParams_
    ) internal view virtual {
        require(
            zkpQueriesStorage.isQueryExists(queryId_),
            "BaseVerifier: ZKP Query does not exist for passed query id."
        );

        IQueryValidator queryValidator_ = IQueryValidator(
            zkpQueriesStorage.getQueryValidator(queryId_)
        );
        uint256 queryHash_ = zkpQueriesStorage.getStoredQueryHash(queryId_);

        queryValidator_.verify(
            proveIdentityParams_.statesMerkleData,
            proveIdentityParams_.inputs,
            proveIdentityParams_.a,
            proveIdentityParams_.b,
            proveIdentityParams_.c,
            queryHash_
        );

        _checkAllowedIssuer(queryId_, proveIdentityParams_.statesMerkleData.issuerId);
        _checkChallenge(proveIdentityParams_.inputs[queryValidator_.getChallengeInputIndex()]);
    }

    function _checkAllowedIssuer(string memory queryId_, uint256 issuerId_) internal view virtual {
        require(
            isAllowedIssuer(zkpQueriesStorage.getStoredSchema(queryId_), issuerId_),
            "BaseVerifier: Issuer is not on the list of allowed issuers."
        );
    }

    function _checkChallenge(uint256 challenge_) internal view virtual {
        require(
            msg.sender == GenesisUtils.int256ToAddress(challenge_),
            "BaseVerifier: Address in proof is not a sender address."
        );
    }

    function _authorizeUpgrade(address) internal override onlyOwner {}
}
