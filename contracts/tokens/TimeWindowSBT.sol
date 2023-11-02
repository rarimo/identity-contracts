// SPDX-License-Identifier: MIT
pragma solidity ^0.8.16;

import {SBT} from "@solarity/solidity-lib/tokens/SBT.sol";

contract TimeWindowSBT is SBT {
    mapping(uint256 => uint256) public tokenExpired;
    address public verifier;
    uint256 public expiringPeriod;

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
            if (tokenExpired[tokens[i]] <= block.timestamp) {
                return 1;
            }
        }
        return 0;
    }

    function ownerOf(uint256 tokenId_) public view override returns (address) {
        return tokenExpired[tokenId_] >= block.timestamp ? SBT.ownerOf(tokenId_) : address(0);
    }

    function mint(address to_, uint256 tokenId_) external onlyVerifier {
        require(balanceOf(to_) < 1, "TimeWindowSBT: active SBT already exists");
        _mint(to_, tokenId_);
    }

    function _beforeTokenAction(address to_, uint256 tokenId_) internal virtual override {
        if (to_ != address(0)) {
            uint256[] memory tokens = tokensOf(to_);
            for (uint256 i; i < tokens.length; i++) {
                _burn(tokens[i]);
            }
        }
    }
}
