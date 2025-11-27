// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {FHE, euint32, externalEuint32} from "@fhevm/solidity/lib/FHE.sol";
import {ZamaEthereumConfig} from "@fhevm/solidity/config/ZamaConfig.sol";

/**
 * @title FHEDoodleJump
 * @notice Encrypted score logger for FHE-based Doodle Jump.
 *         Each player records their Doodle Jump performance privately using FHE.
 *         Plaintext data is never revealed — everything stays encrypted.
 */
contract FHEDoodleJump is ZamaEthereumConfig {
    /// @dev Encrypted jump records (each represents one run/score).
    mapping(address => euint32[]) private _playerJumps;

    /**
     * @notice Submit an encrypted Doodle Jump score.
     * @param encryptedJump The encrypted numeric score (as `externalEuint32`).
     * @param proof Proof verifying the ciphertext integrity.
     */
    function submitJump(externalEuint32 encryptedJump, bytes calldata proof) external {
        euint32 jumpScore = FHE.fromExternal(encryptedJump, proof);
        FHE.allowThis(jumpScore);

        _playerJumps[msg.sender].push(jumpScore);

        // Give decryption permission back to the sender
        FHE.allow(jumpScore, msg.sender);
    }

    /**
     * @notice Get all encrypted jump scores of a player.
     * @param player Address of the player.
     * @return List of encrypted scores (ciphertexts).
     */
    function getJumpHistory(address player) external view returns (euint32[] memory) {
        return _playerJumps[player];
    }

    /**
     * @notice Get the last (most recent) encrypted jump score of the sender.
     * @return The last encrypted jump score.
     */
    function getLastJump() external view returns (euint32) {
        uint256 count = _playerJumps[msg.sender].length;
        require(count > 0, "No jumps recorded yet");
        return _playerJumps[msg.sender][count - 1];
    }

    /**
     * @notice Get the total number of jump scores recorded for a player.
     * @param player Address of the player.
     * @return Total number of recorded jumps.
     */
    function getTotalJumps(address player) external view returns (uint256) {
        return _playerJumps[player].length;
    }
}
