import { expect } from "chai";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { ethers } from "hardhat";
import { Reverter } from "@/test/helpers/reverter";
import { ZERO_ADDR } from "@/scripts/utils/constants";
import { IDENTITY_PROOF_QUERY_ID } from "@/test/helpers/constants";
import { ZKPQueriesStorage, IZKPQueriesStorage, PoseidonFacade } from "@ethers-v5";
import { deployPoseidonFacade } from "@/test/helpers/utils";

describe("ZKPQueriesStorage", () => {
  const reverter = new Reverter();

  const circuitQuery = {
    schema: ethers.BigNumber.from("78927927240581107041951874774584917853"),
    claimPathKey: ethers.BigNumber.from(
      "16153502378554866159038850585713705546745830858436223350513476757548188765156"
    ),
    operator: 1,
    value: [ethers.BigNumber.from(1), ...new Array(63).fill(0).map((i) => ethers.BigNumber.from(0))],
    queryHash: ethers.BigNumber.from(0),
    circuitId: "credentialAtomicQuerySigV2OnChain",
  };

  let OWNER: SignerWithAddress;
  let FIRST: SignerWithAddress;
  let VALIDATOR: SignerWithAddress;
  let LIGHTWEIGHT_STATE: SignerWithAddress;

  let zkpQueriesStorage: ZKPQueriesStorage;
  let poseidonFacade: PoseidonFacade;

  function checkCircuitQuery(actualQuery: any, expectedQuery: any) {
    expect(actualQuery.schema).to.be.eq(expectedQuery.schema);
    expect(actualQuery.circuitId).to.be.eq(expectedQuery.circuitId);
    expect(actualQuery.claimPathKey).to.be.eq(expectedQuery.claimPathKey);
    expect(actualQuery.operator).to.be.eq(expectedQuery.operator);
    expect(actualQuery.queryHash).to.be.eq(expectedQuery.queryHash);
    expect(actualQuery.value).to.be.deep.eq(expectedQuery.value);
  }

  before(async () => {
    [OWNER, FIRST, VALIDATOR, LIGHTWEIGHT_STATE] = await ethers.getSigners();

    poseidonFacade = (await deployPoseidonFacade()).poseidonFacade;

    const ZKPQueriesStorageFactory = await ethers.getContractFactory("ZKPQueriesStorage", {
      libraries: {
        PoseidonFacade: poseidonFacade.address,
      },
    });

    zkpQueriesStorage = await ZKPQueriesStorageFactory.deploy();

    await zkpQueriesStorage.__ZKPQueriesStorage_init(LIGHTWEIGHT_STATE.address);

    const expectedQueryHash = await poseidonFacade.poseidon6([
      circuitQuery.schema,
      0,
      circuitQuery.operator,
      circuitQuery.claimPathKey,
      0,
      await poseidonFacade.poseidonSponge(circuitQuery.value),
    ]);
    circuitQuery.queryHash = expectedQueryHash;

    await reverter.snapshot();
  });

  afterEach(reverter.revert);

  describe("creation", () => {
    it("should set correct init values", async () => {
      expect(await zkpQueriesStorage.owner()).to.be.eq(OWNER.address);
      expect(await zkpQueriesStorage.lightweightState()).to.be.eq(LIGHTWEIGHT_STATE.address);
    });

    it("should get exception if try to call init function twice", async () => {
      const reason = "Initializable: the contract is already initialized";

      expect(zkpQueriesStorage.__ZKPQueriesStorage_init(LIGHTWEIGHT_STATE.address)).to.be.revertedWith(reason);
    });

    it("should get exception if pass zero lightweight state contract address", async () => {
      const ZKPQueriesStorageFactory = await ethers.getContractFactory("ZKPQueriesStorage", {
        libraries: {
          PoseidonFacade: poseidonFacade.address,
        },
      });

      const newZKPQueriesStorage = await ZKPQueriesStorageFactory.deploy();

      const reason = "ZKPQueriesStorage: Zero lightweightState address.";

      expect(newZKPQueriesStorage.__ZKPQueriesStorage_init(ZERO_ADDR)).to.be.revertedWith(reason);
    });
  });

  describe("setZKPQuery", () => {
    it("should correctly set ZKP Query", async () => {
      const queryInfo: IZKPQueriesStorage.QueryInfoStruct = {
        queryValidator: VALIDATOR.address,
        circuitQuery,
      };

      const tx = await zkpQueriesStorage.setZKPQuery(IDENTITY_PROOF_QUERY_ID, queryInfo);

      expect(await zkpQueriesStorage.getSupportedQueryIDs()).to.be.deep.eq([IDENTITY_PROOF_QUERY_ID]);

      const storedQueryInfo = await zkpQueriesStorage.getQueryInfo(IDENTITY_PROOF_QUERY_ID);

      expect(storedQueryInfo.queryValidator).to.be.eq(VALIDATOR.address);
      checkCircuitQuery(storedQueryInfo.circuitQuery, circuitQuery);

      expect(tx)
        .to.emit(zkpQueriesStorage, "ZKPQuerySet")
        .withArgs(IDENTITY_PROOF_QUERY_ID, queryInfo.queryValidator, queryInfo.circuitQuery);
    });

    it("should get exception if pass zero validator address", async () => {
      const reason = "ZKPQueriesStorage: Zero queryValidator address.";

      const queryInfo: IZKPQueriesStorage.QueryInfoStruct = {
        queryValidator: ZERO_ADDR,
        circuitQuery,
      };

      expect(zkpQueriesStorage.setZKPQuery(IDENTITY_PROOF_QUERY_ID, queryInfo)).to.be.revertedWith(reason);
    });

    it("should get exception if nonowner try to call this function", async () => {
      const reason = "Ownable: caller is not the owner";

      const queryInfo: IZKPQueriesStorage.QueryInfoStruct = {
        queryValidator: ZERO_ADDR,
        circuitQuery,
      };

      expect(zkpQueriesStorage.connect(FIRST).setZKPQuery(IDENTITY_PROOF_QUERY_ID, queryInfo)).to.be.revertedWith(
        reason
      );
    });
  });

  describe("removeZKPQuery", () => {
    beforeEach("setup", async () => {
      const queryInfo: IZKPQueriesStorage.QueryInfoStruct = {
        queryValidator: VALIDATOR.address,
        circuitQuery,
      };

      await zkpQueriesStorage.setZKPQuery(IDENTITY_PROOF_QUERY_ID, queryInfo);
    });

    it("should correctly remove ZKP Query", async () => {
      expect(await zkpQueriesStorage.isQueryExists(IDENTITY_PROOF_QUERY_ID)).to.be.eq(true);

      const tx = await zkpQueriesStorage.removeZKPQuery(IDENTITY_PROOF_QUERY_ID);

      expect(await zkpQueriesStorage.isQueryExists(IDENTITY_PROOF_QUERY_ID)).to.be.eq(false);

      const storedQueryInfo = await zkpQueriesStorage.getQueryInfo(IDENTITY_PROOF_QUERY_ID);

      expect(storedQueryInfo.queryValidator).to.be.eq(ZERO_ADDR);
      expect(storedQueryInfo.circuitQuery.schema).to.be.eq(0);
      expect(storedQueryInfo.circuitQuery.circuitId).to.be.eq("");
      expect(storedQueryInfo.circuitQuery.claimPathKey).to.be.eq(0);
      expect(storedQueryInfo.circuitQuery.operator).to.be.eq(0);
      expect(storedQueryInfo.circuitQuery.queryHash).to.be.eq(0);
      expect(storedQueryInfo.circuitQuery.value).to.be.deep.eq([]);

      expect(tx).to.emit(zkpQueriesStorage, "ZKPQueryRemoved").withArgs(IDENTITY_PROOF_QUERY_ID);
    });

    it("should get exception if try to remove nonexisting ZKP Query", async () => {
      const reason = "ZKPQueriesStorage: ZKP Query does not exist.";
      const queryID = "SOME_ID";

      expect(zkpQueriesStorage.removeZKPQuery(queryID)).to.be.revertedWith(reason);
    });

    it("should get exception if nonowner try to call this function", async () => {
      const reason = "Ownable: caller is not the owner";

      expect(zkpQueriesStorage.connect(FIRST).removeZKPQuery(IDENTITY_PROOF_QUERY_ID)).to.be.revertedWith(reason);
    });
  });

  describe("getters", () => {
    beforeEach("setup", async () => {
      const queryInfo: IZKPQueriesStorage.QueryInfoStruct = {
        queryValidator: VALIDATOR.address,
        circuitQuery,
      };

      await zkpQueriesStorage.setZKPQuery(IDENTITY_PROOF_QUERY_ID, queryInfo);
    });

    it("should return correct data", async () => {
      expect(await zkpQueriesStorage.getQueryValidator(IDENTITY_PROOF_QUERY_ID)).to.be.eq(VALIDATOR.address);
      checkCircuitQuery(await zkpQueriesStorage.getStoredCircuitQuery(IDENTITY_PROOF_QUERY_ID), circuitQuery);

      expect(await zkpQueriesStorage.getStoredQueryHash(IDENTITY_PROOF_QUERY_ID)).to.be.eq(circuitQuery.queryHash);
      expect(await zkpQueriesStorage.getStoredSchema(IDENTITY_PROOF_QUERY_ID)).to.be.eq(circuitQuery.schema);

      expect(await zkpQueriesStorage.getQueryHash(circuitQuery)).to.be.eq(circuitQuery.queryHash);
      expect(
        await zkpQueriesStorage.getQueryHashRaw(
          circuitQuery.schema,
          circuitQuery.operator,
          circuitQuery.claimPathKey,
          circuitQuery.value
        )
      ).to.be.eq(circuitQuery.queryHash);
    });
  });
});
