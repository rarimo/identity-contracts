import { Deployer, Logger } from "@solarity/hardhat-migrate";
import { Config, parseConfig } from "@/deploy/helpers/config_parser";
import { deployQueryValidator } from "@/deploy/helpers/deploy_helper";

export = async (deployer: Deployer, logger: Logger) => {
  const config: Config = parseConfig();

  await deployQueryValidator(deployer, logger, config);
};
