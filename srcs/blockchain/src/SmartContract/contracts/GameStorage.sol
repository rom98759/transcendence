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
    uint256 public tournamentCount;
    mapping(uint32 => Tournament) public tournaments;

    event TournamentStored(uint32 match_id, uint32 player1, uint32 player2, uint32 player3, uint32 player4);

    function storeTournament(uint32 id, uint32 p1, uint32 p2, uint32 p3, uint32 p4) external onlyOwner {
        require(tournaments[id].timestamp == 0, "ID already used");
        tournaments[id] = Tournament(p1, p2, p3, p4, uint32(block.timestamp));
        emit TournamentStored(tournamentCount, id, p1, p2, p3, p4);
        
        tournamentCount++;
    }

    function getTournament(uint32 id) external view returns (Tournament memory){
        require(tournaments[id].timestamp != 0, "Tournament does not exist");
        return tournaments[id];
    }
}
