import { Deployer, Logger } from "@solarity/hardhat-migrate";
import { artifacts } from "hardhat";
import { Config, parseConfig, isZeroAddr } from "@/deploy/helpers/config_parser";
import {
  deployVerifier,
  getDeployedStateContract,
  getDeployedQueryValidatorContract,
  getDeployedVerifierContract,
} from "@/deploy/helpers/deploy_helper";

const ERC1967Proxy = artifacts.require("ERC1967Proxy");
const ZKPQueriesStorage = artifacts.require("ZKPQueriesStorage");
const PoseidonFacade = artifacts.require("PoseidonFacade");

export = async (deployer: Deployer, logger: Logger) => {
  const config: Config = parseConfig();

  const poseidonFacade = await PoseidonFacade.deployed();
  await deployer.link(poseidonFacade, ZKPQueriesStorage);

  const stateContractInfo = [
    config.stateContractInfo.isLightweight ? "LightweightState" : "State",
    (await getDeployedStateContract(config.stateContractInfo.isLightweight)).address,
  ];

  let zkpQueriesStorage;

  if (isZeroAddr(config.zkpQueriesStorage)) {
    const zkpQueriesStorageImpl = await deployer.deploy(ZKPQueriesStorage);
    const zkpQueriesStorageProxy = await deployer.deploy(ERC1967Proxy, zkpQueriesStorageImpl.address, []);

    zkpQueriesStorage = await ZKPQueriesStorage.at(zkpQueriesStorageProxy.address);

    logger.logTransaction(
      await zkpQueriesStorage.__ZKPQueriesStorage_init(stateContractInfo[1]),
      "Initialize ZKPQueriesStorage contract"
    );
  } else {
    zkpQueriesStorage = await ZKPQueriesStorage.at(config.zkpQueriesStorage);
  }

  await ZKPQueriesStorage.setAsDeployed(zkpQueriesStorage);

  await deployVerifier(deployer, logger, config);

  const validatorsInfo = [
    config.validatorContractInfo.isMtpValidator ? "QueryMTPValidator" : "QuerySigValidator",
    (await getDeployedQueryValidatorContract(config.validatorContractInfo.isMtpValidator)).address,
  ];
  const verifierInfo = [
    config.identityVerifierInfo.isSBTIdentityVerifier ? "SBTIdentityVerifier" : "IdentityVerifier",
    (await getDeployedVerifierContract(config.identityVerifierInfo.isSBTIdentityVerifier)).address,
  ];

  logger.logContracts(
    stateContractInfo,
    validatorsInfo,
    verifierInfo,
    ["ZKPQueriesStorage", zkpQueriesStorage.address],
    ["PoseidonFacade", poseidonFacade.address]
  );
};
