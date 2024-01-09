import "@nomicfoundation/hardhat-ethers";
import "@nomiclabs/hardhat-web3";
import "@nomiclabs/hardhat-truffle5";
import "@solarity/hardhat-migrate";

import { TASK_COMPILE_SOLIDITY_GET_SOLC_BUILD } from "hardhat/builtin-tasks/task-names";
import { subtask } from "hardhat/config";

const path = require("path");

import * as dotenv from "dotenv";
dotenv.config();

const SOLC_VERSION = "0.8.16";

subtask(TASK_COMPILE_SOLIDITY_GET_SOLC_BUILD, async (args: any, hre, runSuper) => {
  if (args.solcVersion === SOLC_VERSION) {
    const compilerPath = path.join(__dirname, "/node_modules/solc/soljson.js");

    return {
      compilerPath: compilerPath,
      isSolcJs: true,
      version: args.solcVersion,
      longVersion: "",
    };
  }

  return runSuper();
});

function privateKey() {
  return process.env.PRIVATE_KEY !== undefined ? [process.env.PRIVATE_KEY] : [];
}

module.exports = {
  networks: {
    dev: {
      url: `${process.env.DEV_RPC_ENDPOINT}`,
      accounts: privateKey(),
      gasMultiplier: 1.2,
    },
  },
  migrate: {
    pathToMigrations: "./deploy/",
  },
  solidity: {
    version: SOLC_VERSION,
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
    },
  },
};
