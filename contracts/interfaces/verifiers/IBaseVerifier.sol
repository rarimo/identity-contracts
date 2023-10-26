// SPDX-License-Identifier: MIT
pragma solidity 0.8.16;

import {IZKPQueriesStorage} from "../IZKPQueriesStorage.sol";

import {ILightweightState} from "../ILightweightState.sol";

interface IBaseVerifier {
    struct ProveIdentityParams {
        ILightweightState.StatesMerkleData statesMerkleData;
        uint256[] inputs;
        uint256[2] a;
        uint256[2][2] b;
        uint256[2] c;
    }

    struct TransitStateParams {
        bytes32 newIdentitiesStatesRoot;
        ILightweightState.GistRootData gistData;
        bytes proof;
    }

    function setZKPQueriesStorage(IZKPQueriesStorage newZKPQueriesStorage_) external;

    function updateAllowedIssuers(
        uint256 schema_,
        uint256[] calldata issuerIds_,
        bool isAdding_
    ) external;

    function zkpQueriesStorage() external view returns (IZKPQueriesStorage);

    function getAllowedIssuers(uint256 schema_) external view returns (uint256[] memory);

    function isAllowedIssuer(uint256 schema_, uint256 issuerId_) external view returns (bool);
}
