import { Deployer, Logger } from "@solarity/hardhat-migrate";
import { Config, parseConfig } from "@/deploy/helpers/config_parser";
import { deployState } from "@/deploy/helpers/deploy_helper";

export = async (deployer: Deployer, logger: Logger) => {
  const config: Config = parseConfig();

  await deployState(deployer, logger, config);
};
