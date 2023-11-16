import * as fs from "fs";
import { ZERO_ADDR } from "@/scripts/utils/constants";
import { ethers } from "hardhat";
import { BigNumberish } from "@ethersproject/bignumber";

export enum IdentityVerifierType {
  IdentityVerifer = "IdentityVerifier",
  SBTIdentityVerifer = "SBTIdentityVerifier",
  TimeWindowSBTIdentityVerifer = "TimeWindowSBTIdentityVerifier",
}

export type Config = {
  validatorContractInfo: ValidatorContractInfo;
  stateContractInfo: StateContractInfo;
  identityVerifierInfo: IdentityVerifierInfo;
  poseidonFacade?: string;
  zkpQueriesStorage?: string;
  zkpQueries: ZKPQueryInfo[];
};

export type ValidatorContractInfo = {
  validatorAddr?: string;
  identitiesStatesUpdateTime?: string | number;
  isMtpValidator: boolean | string;
};

export type StateContractInfo = {
  stateAddr?: string;
  stateInitParams?: StateInitParams;
  isLightweight: boolean | string;
};

export type IdentityVerifierInfo = {
  identityVerifierAddr?: string;
  verifierInitParams?: IdentityVerifierInitParams;
  identityVerifierType: IdentityVerifierType;
};

export type StateInitParams = {
  signer: string;
  sourceStateContract: string;
  sourceChainName: string;
  chainName: string;
};

export type IdentityVerifierInitParams = {
  verifiedSBTAddr: string;
  verifiedSBTInfo?: VerifiedSBTInfo;
};

export type VerifiedSBTInfo = {
  name: string;
  symbol: string;
  tokenURI: string;
  expirationPeriod?: BigNumberish;
};

export type ZKPQueryInfo = {
  queryId: string;
  validatorAddr?: string;
  query: ZKPQuery;
};

export type ZKPQuery = {
  schema: BigNumberish;
  claimPathKey: BigNumberish;
  operator: string | number;
  value: BigNumberish[];
  queryHash: BigNumberish;
  circuitId: string;
};

export function parseConfig(configPath: string = "deploy/data/config.json"): Config {
  const config: Config = JSON.parse(fs.readFileSync(configPath, "utf-8")) as Config;

  if (config.stateContractInfo.stateAddr == undefined && config.stateContractInfo.stateInitParams == undefined) {
    throw new Error(`Invalid state contract address or state init params.`);
  }

  if (config.stateContractInfo.stateInitParams != undefined) {
    validateStateInitParams(config.stateContractInfo.stateInitParams);
  }

  if (
    config.validatorContractInfo.validatorAddr == undefined &&
    config.validatorContractInfo.identitiesStatesUpdateTime == undefined
  ) {
    throw new Error(`Invalid validator contract address or validator init params.`);
  }

  validateIdentityVerifierInfo(config.identityVerifierInfo);

  config.stateContractInfo.isLightweight = config.stateContractInfo.isLightweight == "true";
  config.validatorContractInfo.isMtpValidator = config.validatorContractInfo.isMtpValidator == "true";

  parseQueriesArr(config.zkpQueries);

  return config;
}

export function nonZeroAddr(filedDataRaw: string | undefined, filedName: string) {
  if (isZeroAddr(filedDataRaw)) {
    throw new Error(`Invalid ${filedName} filed.`);
  }
}

export function nonEmptyFiled(filedDataRaw: string | undefined, filedName: string) {
  if (isEmptyField(filedDataRaw)) {
    throw new Error(`Empty ${filedName} filed.`);
  }
}

export function isZeroAddr(filedDataRaw: string | undefined) {
  return isEmptyField(filedDataRaw) || filedDataRaw === ZERO_ADDR;
}

export function isEmptyField(filedDataRaw: string | undefined) {
  return !filedDataRaw || filedDataRaw == "";
}

function validateStateInitParams(stateInitParams: StateInitParams) {
  nonZeroAddr(stateInitParams.signer, "signer");
  nonZeroAddr(stateInitParams.sourceStateContract, "sourceStateContract");
  nonEmptyFiled(stateInitParams.sourceChainName, "sourceChainName");
  nonEmptyFiled(stateInitParams.chainName, "chainName");
}

function validateIdentityVerifierInfo(identityVerifierInfo: IdentityVerifierInfo) {
  if (!Object.values(IdentityVerifierType).includes(identityVerifierInfo.identityVerifierType)) {
    throw new Error("Invalid identityVerifierType field");
  }

  if (
    identityVerifierInfo.identityVerifierType == IdentityVerifierType.SBTIdentityVerifer ||
    identityVerifierInfo.identityVerifierType == IdentityVerifierType.TimeWindowSBTIdentityVerifer
  ) {
    if (identityVerifierInfo.verifierInitParams == undefined) {
      throw new Error(`Invalid SBT identity verifier init params.`);
    }

    if (isZeroAddr(identityVerifierInfo.verifierInitParams.verifiedSBTAddr)) {
      if (identityVerifierInfo.verifierInitParams.verifiedSBTInfo == undefined) {
        throw new Error(`SBTIdentityVerifier verified SBT info is undefined.`);
      }

      nonEmptyFiled(identityVerifierInfo.verifierInitParams.verifiedSBTInfo.name, "verifiedSBT name");
      nonEmptyFiled(identityVerifierInfo.verifierInitParams.verifiedSBTInfo.symbol, "verifiedSBT symbol");
      nonEmptyFiled(identityVerifierInfo.verifierInitParams.verifiedSBTInfo.tokenURI, "verifiedSBT tokenURI");

      if (identityVerifierInfo.identityVerifierType == IdentityVerifierType.TimeWindowSBTIdentityVerifer) {
        nonEmptyFiled(
          identityVerifierInfo.verifierInitParams.verifiedSBTInfo.expirationPeriod?.toString(),
          "timeWindowSBT expirationPeriod"
        );
      }
    }
  }
}

function parseQueriesArr(zkpQueries: ZKPQueryInfo[]) {
  zkpQueries.forEach((zkpQueryInfo: ZKPQueryInfo) => {
    zkpQueryInfo.query.schema = ethers.BigNumber.from(zkpQueryInfo.query.schema);
    zkpQueryInfo.query.claimPathKey = ethers.BigNumber.from(zkpQueryInfo.query.claimPathKey);
    zkpQueryInfo.query.value = [
      ...zkpQueryInfo.query.value,
      ...new Array(64 - zkpQueryInfo.query.value.length).fill(0).map((i) => 0),
    ];
  });
}
