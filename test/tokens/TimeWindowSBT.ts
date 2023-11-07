import { Reverter } from "@/test/helpers/reverter";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { ethers } from "hardhat";
import { TimeWindowSBT } from "@ethers-v5";
import { expect } from "chai";
import { ZERO_ADDR } from "@/scripts/utils/constants";
import { toBN } from "@/scripts/utils/utils";

describe("TimeWindowSBT", () => {
  const reverter = new Reverter();

  let FIRST: SignerWithAddress;
  let SECOND: SignerWithAddress;
  let VERIFIER: SignerWithAddress;

  let twSBT: TimeWindowSBT;

  before(async () => {
    [FIRST, SECOND, VERIFIER] = await ethers.getSigners();

    twSBT = await (await ethers.getContractFactory("TimeWindowSBT")).deploy();

    await reverter.snapshot();
  });

  afterEach(reverter.revert);

  describe("initialize", () => {
    it("should initialize correctly", async () => {
      const name = "TimeWindow";
      const symbol = "SBT";
      const expiringPeriod = "100";
      await twSBT.__TimeWindowSBT_init(name, symbol, expiringPeriod, VERIFIER.address);

      expect(await twSBT.name()).to.be.eq(name);
      expect(await twSBT.symbol()).to.be.eq(symbol);
      expect(await twSBT.expiringPeriod()).to.be.eq(expiringPeriod);
      expect(await twSBT.verifier()).to.be.eq(VERIFIER.address);
    });

    it("should revert if try to call init function twice", async () => {
      expect(twSBT.__TimeWindowSBT_init("name", "symbol", 1, VERIFIER.address)).to.be.revertedWith(
        "Initializable: the contract is already initialized"
      );
    });

    it("should revert if pass incorrect parameters", async () => {
      const name = "TimeWindow";
      const symbol = "SBT";
      expect(twSBT.__TimeWindowSBT_init(name, symbol, 0, VERIFIER.address)).to.be.revertedWith(
        "TimeWindowSBT: expiringPeriod must be greater then 0"
      );

      expect(twSBT.__TimeWindowSBT_init(name, symbol, 1, ZERO_ADDR)).to.be.revertedWith(
        "TimeWindowSBT: verifier zero address"
      );
    });
  });

  describe("setExpiringPeriod", () => {
    beforeEach(async () => {
      await twSBT.__TimeWindowSBT_init("name", "symbol", 1, VERIFIER.address);
    });

    it("should set new period", async () => {
      const newPeriod = 8008;
      await twSBT.connect(VERIFIER).setExpiringPeriod(newPeriod);

      expect(await twSBT.expiringPeriod()).to.be.eq(newPeriod);
    });

    it("should revert if new period = 0", async () => {
      expect(twSBT.connect(VERIFIER).setExpiringPeriod(0)).to.be.revertedWith(
        "TimeWindowSBT: expiringPeriod must be greater then 0"
      );
    });

    it("should revert if function called by not verifier", async () => {
      expect(twSBT.setExpiringPeriod(1)).to.be.revertedWith("TimeWindowSBT: only verifier can call this function");
    });
  });

  describe("mint", () => {
    const expiringPeriod = "100";

    beforeEach(async () => {
      await twSBT.__TimeWindowSBT_init("name", "symbol", expiringPeriod, VERIFIER.address);
    });

    it("should correctly mint SBT", async () => {
      const nextId = await twSBT.nextTokenId();
      await twSBT.connect(VERIFIER).mint(FIRST.address);

      expect(await twSBT.balanceOf(FIRST.address)).to.be.eq(1);
      expect(await twSBT.ownerOf(nextId)).to.be.eq(FIRST.address);
      expect(await twSBT.tokenExpired(nextId)).to.be.eq(
        toBN((await ethers.provider.getBlock("latest")).timestamp).plus(expiringPeriod)
      );
    });

    it("should burn expired token", async () => {
      const nextIdBefore = await twSBT.nextTokenId();
      await twSBT.connect(VERIFIER).mint(FIRST.address);

      const nextIdAfter = await twSBT.nextTokenId();

      await ethers.provider.send("evm_increaseTime", [101]);
      await ethers.provider.send("evm_mine", []);

      await twSBT.connect(VERIFIER).mint(FIRST.address);

      expect(await twSBT.tokenExists(nextIdAfter)).to.be.true;
      expect(await twSBT.tokenExists(nextIdBefore)).to.be.false;
      expect(await twSBT.balanceOf(FIRST.address)).to.be.eq(1);
      expect(await twSBT.ownerOf(nextIdAfter)).to.be.eq(FIRST.address);
      expect(await twSBT.ownerOf(nextIdBefore)).to.be.eq(ZERO_ADDR);
      expect(await twSBT.tokensOf(FIRST.address)).to.deep.eq([nextIdAfter]);
    });

    it("should revert if user already owns token", async () => {
      await twSBT.connect(VERIFIER).mint(FIRST.address);

      expect(twSBT.connect(VERIFIER).mint(FIRST.address)).to.be.revertedWith(
        "TimeWindowSBT: active SBT already exists"
      );
    });

    it("should revert if function called by not verifier", async () => {
      expect(twSBT.connect(FIRST).mint(FIRST.address)).to.be.revertedWith(
        "TimeWindowSBT: only verifier can call this function"
      );
    });
  });

  describe("view functions", () => {
    const expiringPeriod = "100";

    beforeEach(async () => {
      await twSBT.__TimeWindowSBT_init("name", "symbol", expiringPeriod, VERIFIER.address);
    });

    it("token doesn't exist", async () => {
      expect(await twSBT.tokenExists(1)).to.be.false;
      expect(await twSBT.balanceOf(SECOND.address)).to.be.eq(0);
      expect(await twSBT.ownerOf(1)).to.be.eq(ZERO_ADDR);
      expect(await twSBT.tokensOf(SECOND.address)).to.deep.eq([]);
    });

    it("token exists", async () => {
      const nextId = await twSBT.nextTokenId();

      await twSBT.connect(VERIFIER).mint(FIRST.address);

      expect(await twSBT.tokenExists(nextId)).to.be.true;
      expect(await twSBT.balanceOf(FIRST.address)).to.be.eq(1);
      expect(await twSBT.ownerOf(nextId)).to.be.eq(FIRST.address);
      expect(await twSBT.tokensOf(FIRST.address)).to.deep.eq([nextId]);
    });

    it("token expired", async () => {
      await twSBT.connect(VERIFIER).mint(FIRST.address);

      await ethers.provider.send("evm_increaseTime", [101]);
      await ethers.provider.send("evm_mine", []);

      expect(await twSBT.tokenExists(1)).to.be.false;
      expect(await twSBT.balanceOf(FIRST.address)).to.be.eq(0);
      expect(await twSBT.ownerOf(1)).to.be.eq(ZERO_ADDR);
      expect(await twSBT.tokensOf(FIRST.address)).to.deep.eq([0]);
    });
  });
});
