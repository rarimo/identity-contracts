// SPDX-License-Identifier: MIT
pragma solidity 0.8.16;

import {ICircuitValidator} from "@iden3/contracts/interfaces/ICircuitValidator.sol";

import {ILightweightState} from "./ILightweightState.sol";

/**
 * @title IZKPQueriesStorage
 * @notice The IZKPQueriesStorage interface represents a contract that is responsible for storing and managing zero-knowledge proof (ZKP) queries.
 * It provides functions to set, retrieve, and remove ZKP queries from the storage.
 */
interface IZKPQueriesStorage {
    /**
     * @notice Contains the query information, including the circuit query and query validator
     * @param circuitQuery The circuit query
     * @param queryValidator The query validator
     */
    struct QueryInfo {
        ICircuitValidator.CircuitQuery circuitQuery;
        address queryValidator;
    }

    /**
     * @notice Event emitted when a ZKP query is set
     * @param queryId The ID of the query
     * @param queryValidator The address of the query validator
     * @param newCircuitQuery The new circuit query
     */
    event ZKPQuerySet(
        string indexed queryId,
        address queryValidator,
        ICircuitValidator.CircuitQuery newCircuitQuery
    );

    /**
     * @notice Event emitted when a ZKP query is removed
     * @param queryId The ID of the query
     */
    event ZKPQueryRemoved(string indexed queryId);

    /**
     * @notice Function that set a ZKP query with the provided query ID and query information
     * @param queryId_ The query ID
     * @param queryInfo_ The query information
     */
    function setZKPQuery(string memory queryId_, QueryInfo memory queryInfo_) external;

    /**
     * @notice Function that remove a ZKP query with the specified query ID
     * @param queryId_ The query ID
     */
    function removeZKPQuery(string memory queryId_) external;

    function lightweightState() external view returns (ILightweightState);

    /**
     * @notice Function to get the supported query IDs
     * @return The array of supported query IDs
     */
    function getSupportedQueryIDs() external view returns (string[] memory);

    /**
     * @notice Function to get the query information for a given query ID
     * @param queryId_ The query ID
     * @return The QueryInfo structure with query information
     */
    function getQueryInfo(string calldata queryId_) external view returns (QueryInfo memory);

    /**
     * @notice Function to get the query validator for a given query ID
     * @param queryId_ The query ID
     * @return The query validator contract address
     */
    function getQueryValidator(string calldata queryId_) external view returns (address);

    /**
     * @notice Function to get the stored circuit query for a given query ID
     * @param queryId_ The query ID
     * @return The stored CircuitQuery structure
     */
    function getStoredCircuitQuery(
        string memory queryId_
    ) external view returns (ICircuitValidator.CircuitQuery memory);

    /**
     * @notice Function to get the stored query hash for a given query ID
     * @param queryId_ The query ID
     * @return The stored query hash
     */
    function getStoredQueryHash(string memory queryId_) external view returns (uint256);

    /**
     * @notice Function to get the stored schema for a given query ID
     * @param queryId_ The query ID
     * @return The stored schema id
     */
    function getStoredSchema(string memory queryId_) external view returns (uint256);

    /**
     * @notice Function to check if a query exists for the given query ID
     * @param queryId_ The query ID
     * @return A boolean indicating whether the query exists
     */
    function isQueryExists(string memory queryId_) external view returns (bool);

    /**
     * @notice Function to get the query hash for the provided circuit query
     * @param circuitQuery_ The circuit query
     * @return The query hash
     */
    function getQueryHash(
        ICircuitValidator.CircuitQuery memory circuitQuery_
    ) external view returns (uint256);

    /**
     * @notice Function to get the query hash for the raw values
     * @param schema_ The schema id
     * @param operator_ The query operator
     * @param claimPathKey_ The claim path key
     * @param values_ The values array
     * @return The query hash
     */
    function getQueryHashRaw(
        uint256 schema_,
        uint256 operator_,
        uint256 claimPathKey_,
        uint256[] memory values_
    ) external view returns (uint256);
}
