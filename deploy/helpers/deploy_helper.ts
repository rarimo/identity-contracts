import { Deployer, Logger } from "@solarity/hardhat-migrate";
import { ethers, artifacts } from "hardhat";
import { Config, isZeroAddr } from "./config_parser";

const { poseidonContract } = require("circomlibjs");

const ERC1967Proxy = artifacts.require("ERC1967Proxy");

const QueryMTPVerifier = artifacts.require("VerifierMTP");
const QuerySigVerifier = artifacts.require("VerifierSig");
const StateVerifier = artifacts.require("VerifierV2");

const PoseidonUnit1L = artifacts.require("PoseidonUnit1L");
const PoseidonUnit2L = artifacts.require("PoseidonUnit2L");
const PoseidonUnit3L = artifacts.require("PoseidonUnit3L");

const SmtLib = artifacts.require("SmtLib");
const StateLib = artifacts.require("StateLib");

const VerifiedSBT = artifacts.require("VerifiedSBT");

const QueryMTPValidator = artifacts.require("QueryMTPValidator");
const QuerySigValidator = artifacts.require("QuerySigValidator");

const State = artifacts.require("State");
const LightweightState = artifacts.require("LightweightState");

const ZKPQueriesStorage = artifacts.require("ZKPQueriesStorage");

const IdentityVerifier = artifacts.require("IdentityVerifier");
const SBTIdentityVerifier = artifacts.require("SBTIdentityVerifier");

import * as dotenv from "dotenv";
dotenv.config();

export async function deployPoseidons(deployer: any, poseidonSizeParams: number[], isLog: boolean = true) {
  poseidonSizeParams.forEach((size) => {
    if (![1, 2, 3, 4, 5, 6].includes(size)) {
      throw new Error(`Poseidon should be integer in a range 1..6. Poseidon size provided: ${size}`);
    }
  });

  const deployPoseidon = async (params: number, isLog: boolean) => {
    const abi = poseidonContract.generateABI(params);
    const code = poseidonContract.createCode(params);

    const PoseidonElements = new ethers.ContractFactory(abi, code, deployer);
    const poseidonElements = await PoseidonElements.deploy();

    await poseidonElements.deployed();

    if (isLog) {
      console.log(`Poseidon${params}Elements deployed to:`, poseidonElements.address);
    }

    return poseidonElements;
  };

  const result = [];

  for (const size of poseidonSizeParams) {
    result.push(await deployPoseidon(size, isLog));
  }

  return result;
}

export async function deployQueryValidator(deployer: Deployer, logger: Logger, config: Config) {
  let validatorAddr;

  if (isZeroAddr(config.validatorContractInfo.validatorAddr)) {
    const stateAddr = (await getDeployedStateContract(config.stateContractInfo.isLightweight)).address;
    const identitiesStatesUpdateTime = config.validatorContractInfo.identitiesStatesUpdateTime;

    if (!identitiesStatesUpdateTime) {
      throw new Error("Invalid identities states update time");
    }

    if (config.validatorContractInfo.isMtpValidator) {
      validatorAddr = await deployMTPValidator(deployer, logger, stateAddr, identitiesStatesUpdateTime);
    } else {
      validatorAddr = await deploySigValidator(deployer, logger, stateAddr, identitiesStatesUpdateTime);
    }
  } else {
    validatorAddr = config.validatorContractInfo.validatorAddr;
  }

  if (config.validatorContractInfo.isMtpValidator) {
    const queryMTPValidator = await QueryMTPValidator.at(validatorAddr);

    await QueryMTPValidator.setAsDeployed(queryMTPValidator);
  } else {
    const querySigValidator = await QuerySigValidator.at(validatorAddr);

    await QuerySigValidator.setAsDeployed(querySigValidator);
  }
}

export async function deployState(deployer: Deployer, logger: Logger, config: Config) {
  if (config.stateContractInfo.isLightweight) {
    await deployLightweightState(deployer, logger, config);
  } else {
    await deployStateContract(deployer, logger, config);
  }
}

export async function deployVerifier(deployer: Deployer, logger: Logger, config: Config) {
  if (config.identityVerifierInfo.isSBTIdentityVerifier) {
    await deploySBTIdentityVerifier(deployer, logger, config);
  } else {
    await deployIdentityVerifier(deployer, logger, config);
  }
}

export async function getDeployedQueryValidatorContract(isMtpValidator: boolean | string) {
  return isMtpValidator ? await QueryMTPValidator.deployed() : await QuerySigValidator.deployed();
}

export async function getDeployedStateContract(isLightweight: boolean | string) {
  return isLightweight ? await LightweightState.deployed() : await State.deployed();
}

export async function getDeployedVerifierContract(isSBTIdentityVerifier: boolean | string) {
  return isSBTIdentityVerifier ? await SBTIdentityVerifier.deployed() : await IdentityVerifier.deployed();
}

async function deployMTPValidator(
  deployer: Deployer,
  logger: Logger,
  stateContractAddr: string,
  identitiesStatesUpdateTime: string | number
) {
  const queryMTPVerifier = await deployer.deploy(QueryMTPVerifier);
  const queryMTPValidatorImpl = await deployer.deploy(QueryMTPValidator);
  const queryMTPValidatorProxy = await deployer.deploy(ERC1967Proxy, queryMTPValidatorImpl.address, []);

  const queryMTPValidator = await QueryMTPValidator.at(queryMTPValidatorProxy.address);

  logger.logTransaction(
    await queryMTPValidator.__QueryMTPValidator_init(
      queryMTPVerifier.address,
      stateContractAddr,
      identitiesStatesUpdateTime
    ),
    "Initialize QueryMTPValidator contract"
  );

  return queryMTPValidator.address;
}

async function deploySigValidator(
  deployer: Deployer,
  logger: Logger,
  stateContractAddr: string,
  identitiesStatesUpdateTime: string | number
) {
  const querySigVerifier = await deployer.deploy(QuerySigVerifier);
  const querySigValidatorImpl = await deployer.deploy(QuerySigValidator);
  const querySigValidatorProxy = await deployer.deploy(ERC1967Proxy, querySigValidatorImpl.address, []);

  const querySigValidator = await QuerySigValidator.at(querySigValidatorProxy.address);

  logger.logTransaction(
    await querySigValidator.__QuerySigValidator_init(
      querySigVerifier.address,
      stateContractAddr,
      identitiesStatesUpdateTime
    ),
    "Initialize QuerySigValidator contract"
  );

  return querySigValidator.address;
}

async function deployStateContract(deployer: Deployer, logger: Logger, config: Config) {
  let stateContract;

  if (isZeroAddr(config.stateContractInfo.stateAddr)) {
    const stateVerifier = await deployer.deploy(StateVerifier);

    let poseidons;

    try {
      poseidons = [await PoseidonUnit1L.deployed(), await PoseidonUnit2L.deployed(), await PoseidonUnit3L.deployed()];
    } catch (err) {
      const poseidonsAddresses = await deployPoseidons((await ethers.getSigners())[0], [1, 2, 3]);

      poseidons = [
        await PoseidonUnit1L.at(poseidonsAddresses[0].address),
        await PoseidonUnit2L.at(poseidonsAddresses[1].address),
        await PoseidonUnit3L.at(poseidonsAddresses[2].address),
      ];
    }

    await deployer.link(poseidons[1], SmtLib);
    await deployer.link(poseidons[2], SmtLib);

    await deployer.deploy(SmtLib);
    await deployer.deploy(StateLib);

    await deployer.link(poseidons[0], State);
    await deployer.link(SmtLib, State);
    await deployer.link(StateLib, State);

    const stateImpl = await deployer.deploy(State);

    const stateProxy = await deployer.deploy(ERC1967Proxy, stateImpl.address, []);

    stateContract = await State.at(stateProxy.address);

    logger.logTransaction(await stateContract.__State_init(stateVerifier.address), "Initialize State contract");
  } else {
    stateContract = await State.at(config.stateContractInfo.stateAddr);
  }

  await State.setAsDeployed(stateContract);
}

async function deployLightweightState(deployer: Deployer, logger: Logger, config: Config) {
  let lightweightState;

  if (isZeroAddr(config.stateContractInfo.stateAddr)) {
    const lightweightStateImpl = await deployer.deploy(LightweightState);
    const lightweightStateProxy = await deployer.deploy(ERC1967Proxy, lightweightStateImpl.address, []);

    lightweightState = await LightweightState.at(lightweightStateProxy.address);

    if (config.stateContractInfo.stateInitParams) {
      logger.logTransaction(
        await lightweightState.__LightweightState_init(
          config.stateContractInfo.stateInitParams.signer,
          config.stateContractInfo.stateInitParams.sourceStateContract,
          config.stateContractInfo.stateInitParams.sourceChainName,
          config.stateContractInfo.stateInitParams.chainName
        ),
        "Initialize LightweightState contract"
      );
    } else {
      throw new Error("Invalid state init params");
    }
  } else {
    lightweightState = await LightweightState.at(config.stateContractInfo.stateAddr);
  }

  await LightweightState.setAsDeployed(lightweightState);
}

async function deployIdentityVerifier(deployer: Deployer, logger: Logger, config: Config) {
  let identityVerifier;

  if (isZeroAddr(config.identityVerifierInfo.identityVerifierAddr)) {
    const identityVerifierImpl = await deployer.deploy(IdentityVerifier);
    const identityVerifierProxy = await deployer.deploy(ERC1967Proxy, identityVerifierImpl.address, []);

    identityVerifier = await IdentityVerifier.at(identityVerifierProxy.address);

    const zkpQueriesStorage = await ZKPQueriesStorage.deployed();

    logger.logTransaction(
      await identityVerifier.__IdentityVerifier_init(zkpQueriesStorage.address),
      "Initialize IdentityVerifier contract"
    );
  } else {
    identityVerifier = await IdentityVerifier.at(config.identityVerifierInfo.identityVerifierAddr);
  }

  await IdentityVerifier.setAsDeployed(identityVerifier);
}

async function deploySBTIdentityVerifier(deployer: Deployer, logger: Logger, config: Config) {
  let sbtIdentityVerifier;

  if (isZeroAddr(config.identityVerifierInfo.identityVerifierAddr)) {
    const sbtIdentityVerifierImpl = await deployer.deploy(SBTIdentityVerifier);
    const sbtIdentityVerifierProxy = await deployer.deploy(ERC1967Proxy, sbtIdentityVerifierImpl.address, []);

    sbtIdentityVerifier = await SBTIdentityVerifier.at(sbtIdentityVerifierProxy.address);

    const zkpQueriesStorage = await ZKPQueriesStorage.deployed();
    let verifiedSBT;

    if (isZeroAddr(config.identityVerifierInfo.verifierInitParams?.verifiedSBTAddr)) {
      const verifiedSBTImpl = await deployer.deploy(VerifiedSBT);
      const verifiedSBTProxy = await deployer.deploy(ERC1967Proxy, verifiedSBTImpl.address, []);

      verifiedSBT = await VerifiedSBT.at(verifiedSBTProxy.address);

      logger.logTransaction(
        await verifiedSBT.__VerifiedSBT_init(
          sbtIdentityVerifier.address,
          config.identityVerifierInfo.verifierInitParams?.verifiedSBTInfo?.name,
          config.identityVerifierInfo.verifierInitParams?.verifiedSBTInfo?.symbol,
          config.identityVerifierInfo.verifierInitParams?.verifiedSBTInfo?.tokenURI
        ),
        "Initialize VerifiedSBT contract"
      );
    } else {
      verifiedSBT = await VerifiedSBT.at(config.identityVerifierInfo.verifierInitParams?.verifiedSBTAddr);
    }

    logger.logTransaction(
      await sbtIdentityVerifier.__SBTIdentityVerifier_init(zkpQueriesStorage.address, verifiedSBT.address),
      "Initialize SBTIdentityVerifier contract"
    );
  } else {
    sbtIdentityVerifier = await SBTIdentityVerifier.at(config.identityVerifierInfo.identityVerifierAddr);
  }

  await SBTIdentityVerifier.setAsDeployed(sbtIdentityVerifier);
}
