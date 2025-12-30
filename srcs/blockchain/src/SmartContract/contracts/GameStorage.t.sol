// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.28;

import { Test } from "forge-std/Test.sol";
import {GameStorage} from "./GameStorage.sol";

contract GameStorageTest is Test{
    GameStorage game;
    address OWNER = address(0xAAA);
    address ATTACKER = address(0xBEEF);
    //on passe l'owner au constructeur
    //excecuté avant chaque fonction donc le contract est redéployé
    function setUp() public{
        vm.prank(OWNER);
        game = new GameStorage(OWNER);
        // game = new GameStorage(address(this));
    } 

    function test_InitialValueIsZero() public view {
        try game.getTournament(0) {
            revert("Expected getTournament to revert");
        } catch {}
    }

    function test_StoreTournament() public {
        vm.prank(OWNER);
        game.storeTournament(0,1,2,3,4);
        GameStorage.Tournament memory t = game.getTournament(0);
        require(t.player1 == 1, "tournament[1] should be 1");
        require(t.player2 == 2, "tournament[2] should be 2");
        require(t.player3 == 3, "tournament[3] should be 3");
        require(t.player4 == 4, "tournament[4] should be 4");
    }

    function test_GetWrongTrounament_Fails() public {
        vm.startPrank(OWNER);
        game.storeTournament(0,1,2,3,4);
        game.storeTournament(1,1,2,3,4);
        vm.expectRevert("Tournament does not exist");
        game.getTournament(2);
        vm.stopPrank();
    }

     function test_StoreTournament_onlyOwnerFails() public {
        vm.prank(ATTACKER);
        vm.expectRevert(
            abi.encodeWithSignature(
                "OwnableUnauthorizedAccount(address)",
                ATTACKER
            )
        );
        game.storeTournament(1, 10, 20, 30, 40);
    }
    function test_StoreTournament_cannotOverwrite() public {
        vm.prank(OWNER);
        game.storeTournament(1, 1, 2, 3, 4);
        vm.prank(OWNER);
        vm.expectRevert("ID already used");
        game.storeTournament(1, 4, 6, 7, 8);
    }

    function test_EventMatchesStorage_PerTransaction() public {
        vm.startPrank(OWNER);

        for (uint8 i = 1; i <= 10; i++) {
            // 1️⃣ On s'attend à l'event EXACT
            vm.expectEmit(true, true, true, true);
            emit GameStorage.TournamentStored(i, i, i, i, i);

            // 2️⃣ Transaction
            game.storeTournament(i, i, i, i, i);

            // 3️⃣ Lecture du storage
            GameStorage.Tournament memory t = game.getTournament(i);

            // 4️⃣ Vérification event ↔ storage
            assertEq(t.player1, i);
            assertEq(t.player2, i);
            assertEq(t.player3, i);
            assertEq(t.player4, i);
            assertGt(t.timestamp, 0);
        }

        vm.stopPrank();
    }

}
