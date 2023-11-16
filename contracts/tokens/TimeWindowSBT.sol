// SPDX-License-Identifier: MIT
pragma solidity ^0.8.16;

import {OwnableUpgradeable} from "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";

import {SBT} from "@solarity/solidity-lib/tokens/SBT.sol";

import {ITimeWindowSBT} from "../interfaces/tokens/ITimeWindowSBT.sol";

contract TimeWindowSBT is SBT, ITimeWindowSBT, OwnableUpgradeable {
    address public override verifier;
    uint256 public override expirationPeriod;
    uint256 public override nextTokenId;

    mapping(uint256 => uint256) public override tokensExpirationTime;

    modifier onlyVerifier() {
        require(msg.sender == verifier, "TimeWindowSBT: only verifier can call this function");
        _;
    }

    function __TimeWindowSBT_init(
        address verifier_,
        uint256 expirationPeriod_,
        string memory name_,
        string memory symbol_,
        string calldata baseURI_
    ) external initializer {
        __Ownable_init();
        __SBT_init(name_, symbol_);

        _setBaseURI(baseURI_);
        _setExpirationPeriod(expirationPeriod_);
        _setVerifier(verifier_);
    }

    function setExpirationPeriod(uint256 expirationPeriod_) external onlyOwner {
        _setExpirationPeriod(expirationPeriod_);
    }

    function setVerifier(address newVerifier_) external override onlyOwner {
        _setVerifier(newVerifier_);
    }

    function setTokensURI(string calldata newTokensURI_) external override onlyOwner {
        _setBaseURI(newTokensURI_);
    }

    function mint(address to_) external onlyVerifier {
        require(balanceOf(to_) < 1, "TimeWindowSBT: active SBT already exists");

        uint256 nextTokenId_ = nextTokenId++;

        _mint(to_, nextTokenId_);

        emit TokenMinted(to_, nextTokenId_, tokensExpirationTime[nextTokenId_]);
    }

    function isTokenExpired(uint256 tokenId_) public view returns (bool) {
        return tokensExpirationTime[tokenId_] < block.timestamp;
    }

    function tokenExists(uint256 tokenId_) public view override returns (bool) {
        return !isTokenExpired(tokenId_) && super.tokenExists(tokenId_);
    }

    function balanceOf(address owner_) public view override returns (uint256) {
        if (super.balanceOf(owner_) > 0 && !isTokenExpired(tokenOf(owner_, 0))) {
            return 1;
        }

        return 0;
    }

    function ownerOf(uint256 tokenId_) public view override returns (address) {
        return !isTokenExpired(tokenId_) ? super.ownerOf(tokenId_) : address(0);
    }

    function tokenURI(uint256) public view override returns (string memory) {
        return baseURI();
    }

    function _setExpirationPeriod(uint256 expirationPeriod_) internal {
        require(expirationPeriod_ > 0, "TimeWindowSBT: expirationPeriod must be greater then 0");

        expirationPeriod = expirationPeriod_;
    }

    function _setVerifier(address newVerifier_) internal {
        require(newVerifier_ != address(0), "TimeWindowSBT: verifier zero address");

        verifier = newVerifier_;
    }

    function _beforeTokenAction(address to_, uint256 tokenId_) internal virtual override {
        if (to_ != address(0)) {
            uint256[] memory tokens_ = tokensOf(to_);

            if (tokens_.length > 0) {
                _burn(tokens_[0]);
            }

            tokensExpirationTime[tokenId_] = block.timestamp + expirationPeriod;
        }
    }
}
