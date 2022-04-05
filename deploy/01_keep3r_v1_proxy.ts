import { DeployFunction } from 'hardhat-deploy/types';
import { HardhatRuntimeEnvironment } from 'hardhat/types';

const deployFunction: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployer } = await hre.getNamedAccounts();

  console.info(`Deployer: ${deployer}`);

  const args = [
    '0x0D5Dc686d0a2ABBfDaFDFb4D0533E886517d4E83', // multisig
    '0x1cEB5cB57C4D4E2b2433641b95Dd330A33185A44', // keep3r v1
  ];

  const keep3rV1Proxy = await hre.deployments.deploy('Keep3rV1Proxy', {
    contract: 'Keep3rV1Proxy',
    from: deployer,
    args,
    log: true,
  });
};

deployFunction.tags = ['proxy', 'mainnet'];

export default deployFunction;
