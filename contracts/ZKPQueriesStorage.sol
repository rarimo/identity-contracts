// SPDX-License-Identifier: MIT
pragma solidity 0.8.16;

import {OwnableUpgradeable} from "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import {UUPSUpgradeable} from "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";

import {StringSet} from "@solarity/solidity-lib/libs/data-structures/StringSet.sol";
import {TypeCaster} from "@solarity/solidity-lib/libs/utils/TypeCaster.sol";

import {ICircuitValidator} from "@iden3/contracts/interfaces/ICircuitValidator.sol";
import {PoseidonFacade} from "@iden3/contracts/lib/Poseidon.sol";

import {ILightweightState} from "./interfaces/ILightweightState.sol";
import {IZKPQueriesStorage} from "./interfaces/IZKPQueriesStorage.sol";

contract ZKPQueriesStorage is IZKPQueriesStorage, OwnableUpgradeable, UUPSUpgradeable {
    using StringSet for StringSet.Set;
    using TypeCaster for uint256;

    ILightweightState public override lightweightState;

    mapping(string => QueryInfo) internal _queriesInfo;

    StringSet.Set internal _supportedQueryIds;

    function __ZKPQueriesStorage_init(address lightweightStateAddr_) external initializer {
        __Ownable_init();

        require(
            lightweightStateAddr_ != address(0),
            "ZKPQueriesStorage: Zero lightweightState address."
        );

        lightweightState = ILightweightState(lightweightStateAddr_);
    }

    function setZKPQuery(
        string memory queryId_,
        QueryInfo memory queryInfo_
    ) external override onlyOwner {
        require(
            address(queryInfo_.queryValidator) != address(0),
            "ZKPQueriesStorage: Zero queryValidator address."
        );

        queryInfo_.circuitQuery.queryHash = getQueryHash(queryInfo_.circuitQuery);

        _queriesInfo[queryId_] = queryInfo_;

        _supportedQueryIds.add(queryId_);

        emit ZKPQuerySet(queryId_, address(queryInfo_.queryValidator), queryInfo_.circuitQuery);
    }

    function removeZKPQuery(string memory queryId_) external override onlyOwner {
        require(isQueryExists(queryId_), "ZKPQueriesStorage: ZKP Query does not exist.");

        _supportedQueryIds.remove(queryId_);

        delete _queriesInfo[queryId_];

        emit ZKPQueryRemoved(queryId_);
    }

    function getSupportedQueryIDs() external view override returns (string[] memory) {
        return _supportedQueryIds.values();
    }

    function getQueryInfo(
        string calldata queryId_
    ) external view override returns (QueryInfo memory) {
        return _queriesInfo[queryId_];
    }

    function getQueryValidator(string calldata queryId_) external view override returns (address) {
        return _queriesInfo[queryId_].queryValidator;
    }

    function getStoredCircuitQuery(
        string memory queryId_
    ) external view override returns (ICircuitValidator.CircuitQuery memory) {
        return _queriesInfo[queryId_].circuitQuery;
    }

    function getStoredQueryHash(string memory queryId_) external view override returns (uint256) {
        return _queriesInfo[queryId_].circuitQuery.queryHash;
    }

    function getStoredSchema(string memory queryId_) external view override returns (uint256) {
        return _queriesInfo[queryId_].circuitQuery.schema;
    }

    function isQueryExists(string memory queryId_) public view override returns (bool) {
        return _supportedQueryIds.contains(queryId_);
    }

    function getQueryHash(
        ICircuitValidator.CircuitQuery memory circuitQuery_
    ) public pure override returns (uint256) {
        return
            getQueryHashRaw(
                circuitQuery_.schema,
                circuitQuery_.operator,
                circuitQuery_.claimPathKey,
                circuitQuery_.value
            );
    }

    function getQueryHashRaw(
        uint256 schema_,
        uint256 operator_,
        uint256 claimPathKey_,
        uint256[] memory values_
    ) public pure override returns (uint256) {
        uint256 valueHash_ = PoseidonFacade.poseidonSponge(values_);

        // only merklized claims are supported (claimPathNotExists is false, slot index is set to 0 )
        return
            PoseidonFacade.poseidon6(
                [
                    schema_,
                    0, // slot index
                    operator_,
                    claimPathKey_,
                    0, // claimPathNotExists: 0 for inclusion, 1 for non-inclusion
                    valueHash_
                ]
            );
    }

    function _authorizeUpgrade(address) internal override onlyOwner {}
}
