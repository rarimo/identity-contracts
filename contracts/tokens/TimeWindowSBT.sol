// SPDX-License-Identifier: MIT
pragma solidity ^0.8.16;

import {SBT} from "@solarity/solidity-lib/tokens/SBT.sol";

contract TimeWindowSBT is SBT {
    mapping(uint256 => uint256) public tokenExpired;
    address public verifier;
    uint256 public expiringPeriod;
    uint256 public nextTokenId;

    event TokenMinted(address to, uint256 tokenId, uint256 expiringTime);

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

        __SBT_init(name_, symbol_);
        expiringPeriod = expiringPeriod_;
        verifier = verifier_;
    }

    function tokenExists(uint256 tokenId_) public view override returns (bool) {
        return tokenExpired[tokenId_] >= block.timestamp && SBT.tokenExists(tokenId_);
    }

    function balanceOf(address owner_) public view override returns (uint256) {
        uint256[] memory tokens = tokensOf(owner_);
        for (uint256 i; i < tokens.length; i++) {
            if (tokenExpired[tokens[i]] >= block.timestamp) {
                return 1;
            }
        }
        return 0;
    }

    function ownerOf(uint256 tokenId_) public view override returns (address) {
        return tokenExpired[tokenId_] >= block.timestamp ? SBT.ownerOf(tokenId_) : address(0);
    }

    function setExpiringPeriod(uint256 expiringPeriod_) external onlyVerifier {
        require(expiringPeriod_ > 0, "TimeWindowSBT: expiringPeriod must be greater then 0");
        expiringPeriod = expiringPeriod_;
    }

    function mint(address to_) external onlyVerifier {
        require(balanceOf(to_) < 1, "TimeWindowSBT: active SBT already exists");
        uint256 nextTokenId_ = nextTokenId;
        _mint(to_, nextTokenId_);

        nextTokenId = nextTokenId_ + 1;

        emit TokenMinted(to_, nextTokenId_, tokenExpired[nextTokenId_]);
    }

    function _beforeTokenAction(address to_, uint256 tokenId_) internal virtual override {
        if (to_ != address(0)) {
            uint256[] memory tokens = tokensOf(to_);
            for (uint256 i; i < tokens.length; i++) {
                _burn(tokens[i]);
            }

            tokenExpired[tokenId_] = block.timestamp + expiringPeriod;
        }
    }
}
