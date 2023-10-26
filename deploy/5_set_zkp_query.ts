import { Deployer, Logger } from "@solarity/hardhat-migrate";
import { artifacts } from "hardhat";
import { Config, parseConfig, isZeroAddr, ZKPQueryInfo } from "@/deploy/helpers/config_parser";
import { getDeployedQueryValidatorContract } from "@/deploy/helpers/deploy_helper";

const ZKPQueriesStorage = artifacts.require("ZKPQueriesStorage");

export = async (deployer: Deployer, logger: Logger) => {
  const config: Config = parseConfig();

  const zkpQueriesStorage = await ZKPQueriesStorage.deployed();

  let validator: any = await getDeployedQueryValidatorContract(config.validatorContractInfo.isMtpValidator);

  for (let i = 0; i < config.zkpQueries.length; i++) {
    const zkpQueryInfo: ZKPQueryInfo = config.zkpQueries[i];
    let currentValidatorAddr = zkpQueryInfo.validatorAddr;

    if (isZeroAddr(currentValidatorAddr)) {
      currentValidatorAddr = validator.address;
    }

    const queryInfo = {
      circuitQuery: zkpQueryInfo.query,
      queryValidator: currentValidatorAddr,
    };

    logger.logTransaction(
      await zkpQueriesStorage.setZKPQuery(zkpQueryInfo.queryId, queryInfo),
      `ZKP Query with ${zkpQueryInfo.queryId} id is set`
    );
  }
};
