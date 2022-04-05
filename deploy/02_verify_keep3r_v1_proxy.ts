import { DeployFunction } from 'hardhat-deploy/types';
import { HardhatRuntimeEnvironment } from 'hardhat/types';

const deployFunction: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const proxy = await hre.deployments.get('Keep3rV1Proxy');

  await hre.run('verify:verify', {
    contract: 'contracts/Keep3rV1Proxy.sol:Keep3rV1Proxy',
    address: proxy.address,
    constructorArguments: proxy.args,
  });
};

deployFunction.tags = ['verify-proxy', 'mainnet'];

export default deployFunction;
