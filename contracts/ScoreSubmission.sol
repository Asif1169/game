// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

contract ScoreSubmission is Ownable, ReentrancyGuard {
    uint256 public submissionFee;
    address public feeRecipient;

    uint256 public constant MAX_FEE = 0.05 ether;

    struct ScoreEntry {
        address player;
        string username;
        uint256 score;
        uint256 timestamp;
    }

    ScoreEntry[] public scores;
    mapping(address => uint256) public bestScore;

    event FeeUpdated(uint256 indexed newFee, address indexed byAddress);
    event FeeRecipientUpdated(address indexed newRecipient, address indexed byAddress);
    event ScoreSubmitted(address indexed player, string username, uint256 score, uint256 feePaid);

    constructor(uint256 _initialFee, address _feeRecipient) Ownable(msg.sender) {
        require(_initialFee > 0, "Fee must be > 0");
        require(_initialFee <= MAX_FEE, "Fee exceeds maximum");
        require(_feeRecipient != address(0), "Invalid recipient");
        submissionFee = _initialFee;
        feeRecipient = _feeRecipient;
    }

    function submitScore(string calldata username, uint256 score) external payable nonReentrant {
        require(msg.value == submissionFee, "Incorrect fee");
        require(bytes(username).length > 0, "Empty username");
        require(bytes(username).length <= 32, "Username too long");

        scores.push(ScoreEntry(msg.sender, username, score, block.timestamp));
        if (score > bestScore[msg.sender]) {
            bestScore[msg.sender] = score;
        }

        emit ScoreSubmitted(msg.sender, username, score, msg.value);
    }

    function updateFee(uint256 _newFee) external onlyOwner {
        require(_newFee > 0, "Fee must be > 0");
        require(_newFee <= MAX_FEE, "Fee exceeds maximum");
        submissionFee = _newFee;
        emit FeeUpdated(_newFee, msg.sender);
    }

    function updateFeeRecipient(address _newRecipient) external onlyOwner {
        require(_newRecipient != address(0), "Invalid recipient");
        feeRecipient = _newRecipient;
        emit FeeRecipientUpdated(_newRecipient, msg.sender);
    }

    function getScores(uint256 offset, uint256 limit) external view returns (ScoreEntry[] memory) {
        uint256 start = offset > scores.length ? scores.length : offset;
        uint256 end = start + limit;
        if (end > scores.length) end = scores.length;
        uint256 count = end - start;
        ScoreEntry[] memory result = new ScoreEntry[](count);
        for (uint256 i = 0; i < count; i++) {
            result[i] = scores[start + i];
        }
        return result;
    }

    function getScoresCount() external view returns (uint256) {
        return scores.length;
    }

    function getBestScore(address player) external view returns (uint256) {
        return bestScore[player];
    }

    function getContractBalance() external view returns (uint256) {
        return address(this).balance;
    }

    function getFee() external view returns (uint256) {
        return submissionFee;
    }

    function getMaxFee() external pure returns (uint256) {
        return MAX_FEE;
    }

    function getFeeRecipient() external view returns (address) {
        return feeRecipient;
    }

    receive() external payable {}
}