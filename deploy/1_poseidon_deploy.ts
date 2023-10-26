import { Deployer } from "@solarity/hardhat-migrate";
import { artifacts } from "hardhat";
import { ethers } from "hardhat";
import { deployPoseidons } from "@/deploy/helpers/deploy_helper";
import { Config, parseConfig, isZeroAddr } from "@/deploy/helpers/config_parser";

const PoseidonUnit1L = artifacts.require("PoseidonUnit1L");
const PoseidonUnit2L = artifacts.require("PoseidonUnit2L");
const PoseidonUnit3L = artifacts.require("PoseidonUnit3L");
const PoseidonUnit4L = artifacts.require("PoseidonUnit4L");
const PoseidonUnit5L = artifacts.require("PoseidonUnit5L");
const PoseidonUnit6L = artifacts.require("PoseidonUnit6L");

const SpongePoseidon = artifacts.require("SpongePoseidon");
const PoseidonFacade = artifacts.require("PoseidonFacade");

export = async (deployer: Deployer) => {
  const config: Config = parseConfig();

  if (isZeroAddr(config.poseidonFacade)) {
    const poseidonContracts = await deployPoseidons(
      (
        await ethers.getSigners()
      )[0],
      new Array(6).fill(6).map((_, i) => i + 1)
    );

    const poseidonUnit1L = await PoseidonUnit1L.at(poseidonContracts[0].address);
    const poseidonUnit2L = await PoseidonUnit2L.at(poseidonContracts[1].address);
    const poseidonUnit3L = await PoseidonUnit3L.at(poseidonContracts[2].address);
    const poseidonUnit4L = await PoseidonUnit4L.at(poseidonContracts[3].address);
    const poseidonUnit5L = await PoseidonUnit5L.at(poseidonContracts[4].address);
    const poseidonUnit6L = await PoseidonUnit6L.at(poseidonContracts[5].address);

    await PoseidonUnit1L.setAsDeployed(poseidonUnit1L);
    await PoseidonUnit2L.setAsDeployed(poseidonUnit2L);
    await PoseidonUnit3L.setAsDeployed(poseidonUnit3L);
    await PoseidonUnit4L.setAsDeployed(poseidonUnit4L);
    await PoseidonUnit5L.setAsDeployed(poseidonUnit5L);
    await PoseidonUnit6L.setAsDeployed(poseidonUnit6L);

    await deployer.link(poseidonUnit6L, SpongePoseidon);

    await deployer.deploy(SpongePoseidon);

    await deployer.link(poseidonUnit1L, PoseidonFacade);
    await deployer.link(poseidonUnit2L, PoseidonFacade);
    await deployer.link(poseidonUnit3L, PoseidonFacade);
    await deployer.link(poseidonUnit4L, PoseidonFacade);
    await deployer.link(poseidonUnit5L, PoseidonFacade);
    await deployer.link(poseidonUnit6L, PoseidonFacade);
    await deployer.link(SpongePoseidon, PoseidonFacade);

    await deployer.deploy(PoseidonFacade);
  } else {
    const poseidonFacade = await PoseidonFacade.at(config.poseidonFacade);

    await PoseidonFacade.setAsDeployed(poseidonFacade);
  }
};
