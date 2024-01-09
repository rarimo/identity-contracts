import { Deployer } from "@solarity/hardhat-migrate";
import { artifacts } from "hardhat";
import { ethers } from "hardhat";
import { deployPoseidons } from "@/deploy/helpers/deploy_helper";
import fs from "fs";

const PoseidonUnit1L = artifacts.require("PoseidonUnit1L");
const PoseidonUnit2L = artifacts.require("PoseidonUnit2L");
const PoseidonUnit3L = artifacts.require("PoseidonUnit3L");

const StateVerifier = artifacts.require("VerifierV2");

const SmtLib = artifacts.require("SmtLib");
const StateLib = artifacts.require("StateLib");

const State = artifacts.require("State");

const ERC1967Proxy = artifacts.require("ERC1967Proxy");

import * as dotenv from "dotenv";
dotenv.config();

export = async (deployer: Deployer) => {
  const poseidonsAddresses = await deployPoseidons((await ethers.getSigners())[0], [1, 2, 3]);

  const poseidons = [
    await PoseidonUnit1L.at(poseidonsAddresses[0].address),
    await PoseidonUnit2L.at(poseidonsAddresses[1].address),
    await PoseidonUnit3L.at(poseidonsAddresses[2].address),
  ];

  await deployer.deployed(PoseidonUnit1L, poseidonsAddresses[0].address);
  await deployer.deployed(PoseidonUnit2L, poseidonsAddresses[1].address);
  await deployer.deployed(PoseidonUnit3L, poseidonsAddresses[2].address);

  const stateVerifier = await deployer.deploy(StateVerifier);

  await SmtLib.link(poseidons[1]);
  await SmtLib.link(poseidons[2]);

  const smtLib = await deployer.deploy(SmtLib);
  const stateLib = await deployer.deploy(StateLib);

  await State.link(poseidons[0]);
  await State.link(smtLib);
  await State.link(stateLib);

  const stateImpl = await deployer.deploy(State);

  const stateProxy = await deployer.deploy(ERC1967Proxy, [stateImpl.address, "0x"]);

  const stateContract = await State.at(stateProxy.address);

  await stateContract.__State_init(stateVerifier.address);

  console.log(`$State$ - ${stateContract.address}`);

  const filePath = process.env.OUTPUT_FILE_PATH;

  if (!filePath) {
    throw new Error("Invalid OUTPUT_FILE_PATH filed");
  }

  const jsonInfo = JSON.stringify({
    state: stateContract.address,
  });

  console.log(jsonInfo);

  fs.writeFileSync(filePath, jsonInfo);
};
