import { Logger } from "@solarity/hardhat-migrate";
import { deployPoseidons } from "@/deploy/helpers/deploy_helper";
import hre from "hardhat";

async function main() {
  console.log("Deploying Poseidon contracts...");
  const poseidonsAddresses = await deployPoseidons((await hre.ethers.getSigners())[0], [1, 2, 3]);

  console.log("Poseidon contracts successfully deployed!");

  const StateVerfierFactory = await hre.ethers.getContractFactory("VerifierV2");

  console.log("Deploying StateVerifier contract...");
  const stateVerifier = await StateVerfierFactory.deploy();
  await stateVerifier.deployTransaction.wait();

  const SmtLibFactory = await hre.ethers.getContractFactory("SmtLib", {
    libraries: {
      PoseidonUnit2L: poseidonsAddresses[1].address,
      PoseidonUnit3L: poseidonsAddresses[2].address,
    },
  });

  console.log("Deploying SmtLib contract...");
  const smtLib = await SmtLibFactory.deploy();
  await smtLib.deployTransaction.wait();

  const StateLibFactory = await hre.ethers.getContractFactory("StateLib");

  console.log("Deploying StateLib contract...");
  const stateLib = await StateLibFactory.deploy();
  await stateLib.deployTransaction.wait();

  const StateFactory = await hre.ethers.getContractFactory("State", {
    libraries: {
      PoseidonUnit1L: poseidonsAddresses[0].address,
      StateLib: stateLib.address,
      SmtLib: smtLib.address,
    },
  });
  const ERC1967ProxyFactory = await hre.ethers.getContractFactory("ERC1967Proxy");

  console.log("Deploying State contract implementation...");
  const stateImpl = await StateFactory.deploy();
  await stateImpl.deployTransaction.wait();

  console.log("Deploying State contract proxy...");
  const stateProxy = await ERC1967ProxyFactory.deploy(stateImpl.address, []);
  await stateProxy.deployTransaction.wait();

  console.log("Initializing State contract...");

  const state = StateFactory.attach(stateProxy.address);

  const tx = await state.__State_init(stateVerifier.address);
  await tx.wait();

  new Logger(hre).logContracts(
    ["StateVerifier", stateVerifier.address],
    ["SmtLib", smtLib.address],
    ["StateLib", stateLib.address],
    ["State implementation", stateImpl.address],
    ["State", state.address]
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
