// SPDX-License-Identifier: MIT
pragma solidity 0.8.16;

import {IState} from "@iden3/contracts/interfaces/IState.sol";

interface ILightweightState {
    enum MethodId {
        None,
        AuthorizeUpgrade,
        ChangeSourceStateContract
    }

    struct GistRootData {
        uint256 root;
        uint256 createdAtTimestamp;
    }

    struct IdentitiesStatesRootData {
        bytes32 root;
        uint256 setTimestamp;
    }

    struct StatesMerkleData {
        uint256 issuerId;
        uint256 issuerState;
        uint256 createdAtTimestamp;
        bytes32[] merkleProof;
    }

    event SignedStateTransited(uint256 newGistRoot, bytes32 newIdentitesStatesRoot);

    function changeSourceStateContract(
        address newSourceStateContract_,
        bytes calldata signature_
    ) external;

    function changeSigner(bytes calldata newSignerPubKey_, bytes calldata signature_) external;

    function signedTransitState(
        bytes32 newIdentitiesStatesRoot_,
        GistRootData calldata gistData_,
        bytes calldata proof_
    ) external;

    function sourceStateContract() external view returns (address);

    function sourceChainName() external view returns (string memory);

    function identitiesStatesRoot() external view returns (bytes32);

    function isIdentitiesStatesRootExists(bytes32 root_) external view returns (bool);

    function getIdentitiesStatesRootData(
        bytes32 root_
    ) external view returns (IdentitiesStatesRootData memory);

    function getGISTRoot() external view returns (uint256);

    function getCurrentGISTRootInfo() external view returns (GistRootData memory);

    function geGISTRootData(uint256 root_) external view returns (GistRootData memory);

    function verifyStatesMerkleData(
        StatesMerkleData calldata statesMerkleData_
    ) external view returns (bool, bytes32);
}
