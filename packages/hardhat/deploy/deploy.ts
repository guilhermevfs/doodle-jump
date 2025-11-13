import { DeployFunction } from "hardhat-deploy/types";
import { HardhatRuntimeEnvironment } from "hardhat/types";

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployer } = await hre.getNamedAccounts();
  const { deploy } = hre.deployments;

  const deployedFHEDoodleJump = await deploy("FHEDoodleJump", {
    from: deployer,
    log: true,
  });

  console.log(`FHEDoodleJump contract: `, deployedFHEDoodleJump.address);
};
export default func;
func.id = "deploy_FHEDoodleJump"; // id required to prevent reexecution
func.tags = ["FHEDoodleJump"];
