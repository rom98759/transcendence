import { expect } from "chai";
import hre from "hardhat";

describe("GameStorage", function () {
  it("Should store tournaments and emit correct events", async function () {
    const { ethers } = await hre.network.connect();

    // Hardhat signers
    const [owner] = await ethers.getSigners();

    // Deploy contract WITH expected constructor argument
    const GameStorage = await ethers.getContractFactory("GameStorage");
    const game = await GameStorage.deploy(owner.address);
    await game.waitForDeployment();

    const gameAddress = await game.getAddress();
    console.log("Deployed GameStorage at:", gameAddress);

  for (let i = 1; i <= 10; i++) {
    const tx = await game.storeTournament(i, i, i, i, i);
    const receipt = await tx.wait();

    // 1. extraire l'event
    const event = receipt.logs
      .map(log => game.interface.parseLog(log))
      .find(e => e?.name === "TournamentStored");

    expect(event).to.not.be.undefined;

    const { match_id, player1, player2, player3, player4 } = event!.args;

    // 2. lire le storage
    const t = await game.getTournament(match_id);

    // 3. comparer event ↔ storage
    expect(t.player1).to.equal(player1);
    expect(t.player2).to.equal(player2);
    expect(t.player3).to.equal(player3);
    expect(t.player4).to.equal(player4);
    }
  });
});

