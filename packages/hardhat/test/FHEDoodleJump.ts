import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { ethers, fhevm } from "hardhat";
import { expect } from "chai";
import { FHEDoodleJump, FHEDoodleJump__factory } from "../types";
import { FhevmType } from "@fhevm/hardhat-plugin";

type Users = {
  admin: HardhatEthersSigner;
  player1: HardhatEthersSigner;
  player2: HardhatEthersSigner;
};

async function deployDoodleContract() {
  const factory = (await ethers.getContractFactory("FHEDoodleJump")) as FHEDoodleJump__factory;
  const contract = (await factory.deploy()) as FHEDoodleJump;
  const address = await contract.getAddress();
  return { contract, address };
}

describe("FHEDoodleJump - Encrypted Score Tracking", function () {
  let users: Users;
  let doodle: FHEDoodleJump;
  let doodleAddr: string;

  before(async () => {
    const [admin, p1, p2] = await ethers.getSigners();
    users = { admin, player1: p1, player2: p2 };
  });

  beforeEach(async function () {
    if (!fhevm.isMock) {
      console.warn("⚠️ Local FHEVM mock required for these tests");
      this.skip();
    }
    ({ contract: doodle, address: doodleAddr } = await deployDoodleContract());
  });

  it("starts with an empty jump history for a new player", async () => {
    // Confirm that a new player has no recorded scores
    const history = await doodle.getJumpHistory(users.player1.address);
    expect(history.length).to.eq(0);
  });

  it("records a single encrypted jump score and allows owner decryption", async () => {
    // Player submits one score, which should be retrievable and decryptable only by them
    const enc = await fhevm
      .createEncryptedInput(doodleAddr, users.player1.address)
      .add32(1500) // example score
      .encrypt();
    await doodle.connect(users.player1).submitJump(enc.handles[0], enc.inputProof);

    const stored = await doodle.getJumpHistory(users.player1.address);
    expect(stored.length).to.eq(1);

    const decrypted = await fhevm.userDecryptEuint(FhevmType.euint32, stored[0], doodleAddr, users.player1);
    expect(decrypted).to.eq(1500);
  });

  it("handles multiple sequential jump submissions", async () => {
    // Player submits multiple scores, all must be stored and decrypted in correct order
    const scores = [1200, 1800, 1600];
    for (const s of scores) {
      const enc = await fhevm.createEncryptedInput(doodleAddr, users.player1.address).add32(s).encrypt();
      await doodle.connect(users.player1).submitJump(enc.handles[0], enc.inputProof);
      await ethers.provider.send("evm_mine", []);
    }

    const history = await doodle.getJumpHistory(users.player1.address);
    expect(history.length).to.eq(scores.length);

    for (let i = 0; i < history.length; i++) {
      const val = await fhevm.userDecryptEuint(FhevmType.euint32, history[i], doodleAddr, users.player1);
      expect(val).to.eq(scores[i]);
    }
  });

  it("ensures scores remain private between different players", async () => {
    // Two players submit scores; each can decrypt only their own
    const enc1 = await fhevm.createEncryptedInput(doodleAddr, users.player1.address).add32(1400).encrypt();
    await doodle.connect(users.player1).submitJump(enc1.handles[0], enc1.inputProof);

    const enc2 = await fhevm.createEncryptedInput(doodleAddr, users.player2.address).add32(1700).encrypt();
    await doodle.connect(users.player2).submitJump(enc2.handles[0], enc2.inputProof);

    const hist1 = await doodle.getJumpHistory(users.player1.address);
    const hist2 = await doodle.getJumpHistory(users.player2.address);

    expect(hist1.length).to.eq(1);
    expect(hist2.length).to.eq(1);

    const val1 = await fhevm.userDecryptEuint(FhevmType.euint32, hist1[0], doodleAddr, users.player1);
    const val2 = await fhevm.userDecryptEuint(FhevmType.euint32, hist2[0], doodleAddr, users.player2);

    expect(val1).to.eq(1400);
    expect(val2).to.eq(1700);
  });

  it("records repeated identical scores without conflict", async () => {
    // Player submits same score multiple times; history must reflect all entries
    const repeated = [2000, 2000];
    for (const s of repeated) {
      const enc = await fhevm.createEncryptedInput(doodleAddr, users.player1.address).add32(s).encrypt();
      await doodle.connect(users.player1).submitJump(enc.handles[0], enc.inputProof);
    }

    const history = await doodle.getJumpHistory(users.player1.address);
    expect(history.length).to.eq(2);

    for (const h of history) {
      const val = await fhevm.userDecryptEuint(FhevmType.euint32, h, doodleAddr, users.player1);
      expect(val).to.eq(2000);
    }
  });

  it("accepts the maximum uint32 score as input", async () => {
    // Confirm system supports max uint32 without errors
    const maxVal = 2 ** 32 - 1;
    const enc = await fhevm.createEncryptedInput(doodleAddr, users.player1.address).add32(maxVal).encrypt();
    await doodle.connect(users.player1).submitJump(enc.handles[0], enc.inputProof);

    const history = await doodle.getJumpHistory(users.player1.address);
    const decrypted = await fhevm.userDecryptEuint(FhevmType.euint32, history[0], doodleAddr, users.player1);
    expect(decrypted).to.eq(maxVal);
  });

  it("maintains the correct order of scores over multiple runs", async () => {
    // Ensure chronological order is preserved in history
    const dataset = [1100, 1300, 1500, 1200];
    for (const s of dataset) {
      const enc = await fhevm.createEncryptedInput(doodleAddr, users.player1.address).add32(s).encrypt();
      await doodle.connect(users.player1).submitJump(enc.handles[0], enc.inputProof);
    }

    const all = await doodle.getJumpHistory(users.player1.address);
    expect(all.length).to.eq(dataset.length);

    const first = await fhevm.userDecryptEuint(FhevmType.euint32, all[0], doodleAddr, users.player1);
    const last = await fhevm.userDecryptEuint(FhevmType.euint32, all[all.length - 1], doodleAddr, users.player1);

    expect(first).to.eq(dataset[0]);
    expect(last).to.eq(dataset[dataset.length - 1]);
  });

  it("handles rapid consecutive submissions gracefully", async () => {
    // Multiple scores submitted in quick succession should be recorded correctly
    const rapid = [1600, 1800, 1400];
    for (const s of rapid) {
      const enc = await fhevm.createEncryptedInput(doodleAddr, users.player1.address).add32(s).encrypt();
      await doodle.connect(users.player1).submitJump(enc.handles[0], enc.inputProof);
    }

    const stored = await doodle.getJumpHistory(users.player1.address);
    expect(stored.length).to.eq(rapid.length);

    const last = await fhevm.userDecryptEuint(FhevmType.euint32, stored[stored.length - 1], doodleAddr, users.player1);
    expect(last).to.eq(rapid[rapid.length - 1]);
  });
});
