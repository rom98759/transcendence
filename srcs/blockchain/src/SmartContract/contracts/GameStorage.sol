// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.28;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

contract GameStorage is Ownable {
    constructor(address initialOwner) Ownable(initialOwner) {}

    struct Tournament {
        uint32 player1;
        uint32 player2;
        uint32 player3;
        uint32 player4;
        uint32 timestamp;
    }
    mapping(uint32 => Tournament) public tournaments;
    uint256[] public tournamentIds;
    mapping(uint32 => bool) public exists;

    event TournamentStored(
        uint32 tour_id,
        uint32 player1,
        uint32 player2,
        uint32 player3,
        uint32 player4,
        uint32 ts,
        bytes32 snapshotHash
    );

    function storeTournament(uint32 tour_id, uint32 player1, uint32 player2, uint32 player3, uint32 player4) external onlyOwner {
        require(!exists[tour_id], "Tournament already stored!");
        uint32 ts = uint32(block.timestamp);
        exists[tour_id] = true;
        tournaments[tour_id] = Tournament(player1, player2, player3, player4, ts);
        bytes32 snapshotHash = keccak256(abi.encode(tour_id, player1, player2, player3, player4, ts));
        emit TournamentStored(tour_id, player1, player2, player3, player4, ts, snapshotHash);
        tournamentIds.push(tour_id); 
    }

    function getTournament(uint32 tour_id) external view returns (Tournament memory){
        require(exists[tour_id], "Tournament does not exist!");
        return tournaments[tour_id];
    }
    
    function getNbTournamentStored() external view returns (uint256){
        return tournamentIds.length;
    }
}
