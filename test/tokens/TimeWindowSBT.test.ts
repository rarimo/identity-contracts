import { Reverter } from "@/test/helpers/reverter";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { ethers } from "hardhat";
import { expect, should } from "chai";
import { ZERO_ADDR } from "@/scripts/utils/constants";
import { TimeWindowSBT } from "@ethers-v5";
import { toBN } from "@/scripts/utils/utils";

describe("TimeWindowSBT", () => {
  const reverter = new Reverter();

  const name = "TimeWindow";
  const symbol = "SBT";
  const tokenURI = "some token URI";
  const expirationPeriod = 3600;

  let FIRST: SignerWithAddress;
  let SECOND: SignerWithAddress;
  let VERIFIER: SignerWithAddress;

  let twSBT: TimeWindowSBT;

  before(async () => {
    [FIRST, SECOND, VERIFIER] = await ethers.getSigners();

    const TimeWindowSBTFactory = await ethers.getContractFactory("TimeWindowSBT");
    twSBT = await TimeWindowSBTFactory.deploy();

    await twSBT.__TimeWindowSBT_init(VERIFIER.address, expirationPeriod, name, symbol, tokenURI);

    await reverter.snapshot();
  });

  afterEach(reverter.revert);

  describe("initialize", () => {
    it("should initialize correctly", async () => {
      expect(await twSBT.name()).to.be.eq(name);
      expect(await twSBT.symbol()).to.be.eq(symbol);
      expect(await twSBT.baseURI()).to.be.eq(tokenURI);
      expect(await twSBT.expirationPeriod()).to.be.eq(expirationPeriod);
      expect(await twSBT.verifier()).to.be.eq(VERIFIER.address);
    });

    it("should revert if try to call init function twice", async () => {
      await expect(
        twSBT.__TimeWindowSBT_init(VERIFIER.address, expirationPeriod, name, symbol, tokenURI)
      ).to.be.revertedWith("Initializable: contract is already initialized");
    });

    it("should revert if pass incorrect parameters", async () => {
      const TimeWindowSBTFactory = await ethers.getContractFactory("TimeWindowSBT");
      const newTWSBT = await TimeWindowSBTFactory.deploy();

      await expect(newTWSBT.__TimeWindowSBT_init(VERIFIER.address, 0, name, symbol, tokenURI)).to.be.revertedWith(
        "TimeWindowSBT: expirationPeriod must be greater then 0"
      );

      await expect(
        newTWSBT.__TimeWindowSBT_init(ZERO_ADDR, expirationPeriod, name, symbol, tokenURI)
      ).to.be.revertedWith("TimeWindowSBT: verifier zero address");
    });
  });

  describe("setVerifier", () => {
    it("should correctly update verifier contract", async () => {
      await twSBT.setVerifier(FIRST.address);

      expect(await twSBT.verifier()).to.be.eq(FIRST.address);
    });

    it("should get exception if pass zero address", async () => {
      const reason = "TimeWindowSBT: verifier zero address";

      await expect(twSBT.setVerifier(ZERO_ADDR)).to.be.revertedWith(reason);
    });

    it("should get exception if nonowner try to call this function", async () => {
      const reason = "Ownable: caller is not the owner";

      await expect(twSBT.connect(SECOND).setVerifier(SECOND.address)).to.be.revertedWith(reason);
    });
  });

  describe("setTokensURI", () => {
    it("should correctly update tokens URI", async () => {
      const nextId = await twSBT.nextTokenId();

      await twSBT.connect(VERIFIER).mint(FIRST.address);

      const newTokensURI = "new tokens URI";

      await twSBT.setTokensURI(newTokensURI);

      expect(await twSBT.tokenURI(nextId)).to.be.eq(newTokensURI);
      expect(await twSBT.baseURI()).to.be.eq(newTokensURI);
    });

    it("should get exception if nonowner try to call this function", async () => {
      const newTokensURI = "new tokens URI";
      const reason = "Ownable: caller is not the owner";

      await expect(twSBT.connect(SECOND).setTokensURI(newTokensURI)).to.be.revertedWith(reason);
    });
  });

  describe("setExpirationPeriod", () => {
    it("should set new period", async () => {
      const newPeriod = 8008;
      await twSBT.setExpirationPeriod(newPeriod);

      expect(await twSBT.expirationPeriod()).to.be.eq(newPeriod);
    });

    it("should revert if new period = 0", async () => {
      await expect(twSBT.setExpirationPeriod(0)).to.be.revertedWith(
        "TimeWindowSBT: expirationPeriod must be greater then 0"
      );
    });

    it("should revert if function called by not verifier", async () => {
      await expect(twSBT.connect(SECOND).setExpirationPeriod(1)).to.be.revertedWith("Ownable: caller is not the owner");
    });
  });

  describe("mint", () => {
    it("should correctly mint 2 SBTs", async () => {
      let nextId = await twSBT.nextTokenId();

      await twSBT.connect(VERIFIER).mint(FIRST.address);

      expect(await twSBT.balanceOf(FIRST.address)).to.be.eq(1);
      expect(await twSBT.ownerOf(nextId)).to.be.eq(FIRST.address);
      expect(await twSBT.tokensExpirationTime(nextId)).to.be.eq(
        toBN((await ethers.provider.getBlock("latest")).timestamp).plus(expirationPeriod)
      );

      nextId = await twSBT.nextTokenId();
      await twSBT.connect(VERIFIER).mint(SECOND.address);
      expect(await twSBT.balanceOf(SECOND.address)).to.be.eq(1);
      expect(await twSBT.ownerOf(nextId)).to.be.eq(SECOND.address);
      expect(await twSBT.tokensExpirationTime(nextId)).to.be.eq(
        toBN((await ethers.provider.getBlock("latest")).timestamp).plus(expirationPeriod)
      );
    });

    it("should burn expired token", async () => {
      const nextIdBefore = await twSBT.nextTokenId();
      await twSBT.connect(VERIFIER).mint(FIRST.address);

      const nextIdAfter = await twSBT.nextTokenId();

      await ethers.provider.send("evm_increaseTime", [expirationPeriod + 1]);
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

      await expect(twSBT.connect(VERIFIER).mint(FIRST.address)).to.be.revertedWith(
        "TimeWindowSBT: active SBT already exists"
      );
    });

    it("should revert if function called by not verifier", async () => {
      await expect(twSBT.mint(FIRST.address)).to.be.revertedWith("TimeWindowSBT: only verifier can call this function");
    });
  });

  describe("view functions", () => {
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

      await ethers.provider.send("evm_increaseTime", [expirationPeriod + 1]);
      await ethers.provider.send("evm_mine", []);

      expect(await twSBT.tokenExists(1)).to.be.false;
      expect(await twSBT.balanceOf(FIRST.address)).to.be.eq(0);
      expect(await twSBT.ownerOf(1)).to.be.eq(ZERO_ADDR);
      expect(await twSBT.tokensOf(FIRST.address)).to.deep.eq([0]);
    });
  });
});
