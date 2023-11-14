// SPDX-License-Identifier: MIT
pragma solidity ^0.8.16;

import {SBT} from "@solarity/solidity-lib/tokens/SBT.sol";
import {ITimeWindowSBT} from "../interfaces/tokens/ITimeWindowSBT.sol";
import {OwnableUpgradeable} from "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";

contract TimeWindowSBT is SBT, ITimeWindowSBT, OwnableUpgradeable {
    address public override verifier;
    uint256 public override expiringPeriod;
    uint256 public override nextTokenId;

    mapping(uint256 => uint256) public tokenExpired;

    modifier onlyVerifier() {
        require(msg.sender == verifier, "TimeWindowSBT: only verifier can call this function");
        _;
    }

    function __TimeWindowSBT_init(
        string memory name_,
        string memory symbol_,
        uint256 expiringPeriod_,
        address verifier_
    ) external initializer {
        require(expiringPeriod_ > 0, "TimeWindowSBT: expiringPeriod must be greater then 0");
        require(verifier_ != address(0), "TimeWindowSBT: verifier zero address");

        __Ownable_init();
        __SBT_init(name_, symbol_);

        expiringPeriod = expiringPeriod_;
        verifier = verifier_;
    }

    function setExpiringPeriod(uint256 expiringPeriod_) external onlyOwner {
        require(expiringPeriod_ > 0, "TimeWindowSBT: expiringPeriod must be greater then 0");
        expiringPeriod = expiringPeriod_;
    }

    function mint(address to_) external onlyVerifier {
        require(balanceOf(to_) < 1, "TimeWindowSBT: active SBT already exists");
        uint256 nextTokenId_ = nextTokenId++;
        _mint(to_, nextTokenId_);

        emit TokenMinted(to_, nextTokenId_, tokenExpired[nextTokenId_]);
    }

    function isTokenExpired(uint256 tokenId_) public view returns (bool) {
        return tokenExpired[tokenId_] >= block.timestamp;
    }

    function tokenExists(uint256 tokenId_) public view override returns (bool) {
        return isTokenExpired(tokenId_) && SBT.tokenExists(tokenId_);
    }

    function balanceOf(address owner_) public view override returns (uint256) {
        uint256[] memory tokens = tokensOf(owner_);
        if (tokens.length > 0 && isTokenExpired(tokens[0])) {
            return 1;
        }
        return 0;
    }

    function ownerOf(uint256 tokenId_) public view override returns (address) {
        return isTokenExpired(tokenId_) ? SBT.ownerOf(tokenId_) : address(0);
    }

    function _beforeTokenAction(address to_, uint256 tokenId_) internal virtual override {
        if (to_ != address(0)) {
            uint256[] memory tokens = tokensOf(to_);
            if (tokens.length > 0) {
                _burn(tokens[0]);
            }

            tokenExpired[tokenId_] = block.timestamp + expiringPeriod;
        }
    }
}
