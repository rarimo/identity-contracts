import { ethers } from "hardhat";

const { poseidonContract } = require("circomlibjs");

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

    await poseidonElements.deploymentTransaction()?.wait();

    if (isLog) {
      console.log(`Poseidon${params}Elements deployed to:`, await poseidonElements.getAddress());
    }

    return poseidonElements;
  };

  const result = [];

  for (const size of poseidonSizeParams) {
    result.push(await deployPoseidon(size, isLog));
  }

  return result;
}
