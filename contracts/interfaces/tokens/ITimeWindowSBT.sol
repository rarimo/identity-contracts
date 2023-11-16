// SPDX-License-Identifier: MIT
pragma solidity ^0.8.16;

interface ITimeWindowSBT {
    event TokenMinted(address to, uint256 tokenId, uint256 expiringTime);

    function verifier() external view returns (address);

    function expiringPeriod() external view returns (uint256);

    function nextTokenId() external view returns (uint256);

    function __TimeWindowSBT_init(
        address verifier_,
        uint256 expiringPeriod_,
        string memory name_,
        string memory symbol_,
        string calldata baseURI_
    ) external;

    function setVerifier(address newVerifier_) external;

    function setTokensURI(string calldata newTokensURI_) external;

    function setExpiringPeriod(uint256 expiringPeriod_) external;

    function isTokenExpired(uint256 tokenId_) external view returns (bool);

    function tokensExpiringTime(uint256 tokenId_) external view returns (uint256);
}
