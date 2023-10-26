import { ethers } from "hardhat";
import { deployPoseidons } from "@/deploy/helpers/deploy_helper";

const { poseidonContract } = require("circomlibjs");

export async function getPoseidonContract(params: number) {
  const abi = poseidonContract.generateABI(params);
  const code = poseidonContract.createCode(params);

  const PoseidonElements = new ethers.ContractFactory(abi, code, (await ethers.getSigners())[0]);
  const poseidonElements = await PoseidonElements.deploy();

  return poseidonElements;
}

export async function deployPoseidonFacade() {
  const poseidonContracts = await deployPoseidons(
    (
      await ethers.getSigners()
    )[0],
    new Array(6).fill(6).map((_, i) => i + 1),
    false
  );

  const SpongePoseidonFactory = await ethers.getContractFactory("SpongePoseidon", {
    libraries: {
      PoseidonUnit6L: poseidonContracts[5].address,
    },
  });

  const spongePoseidon = await SpongePoseidonFactory.deploy();

  const PoseidonFacadeFactory = await ethers.getContractFactory("PoseidonFacade", {
    libraries: {
      PoseidonUnit1L: poseidonContracts[0].address,
      PoseidonUnit2L: poseidonContracts[1].address,
      PoseidonUnit3L: poseidonContracts[2].address,
      PoseidonUnit4L: poseidonContracts[3].address,
      PoseidonUnit5L: poseidonContracts[4].address,
      PoseidonUnit6L: poseidonContracts[5].address,
      SpongePoseidon: spongePoseidon.address,
    },
  });

  const poseidonFacade = await PoseidonFacadeFactory.deploy();

  return {
    poseidonContracts,
    spongePoseidon,
    poseidonFacade,
  };
}

export function getProofData(fileName: string) {
  const json = require(`@/test/data/${fileName}`);

  return {
    inputs: json.pub_signals,
    a: json.proof.pi_a,
    b: json.proof.pi_b,
    c: json.proof.pi_c,
  };
}
