import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';
import { IKeep3rV1, Keep3rV1Proxy, Keep3rV1Proxy__factory } from '@types';
import { contracts, wallet } from '@utils';
import { toUnit } from '@utils/bn';
import { ethers } from 'hardhat';

export const FORK_BLOCK_NUMBER = 12954370;
export const WETH_ADDRESS = '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2';
export const RICH_ETH_ADDRESS = '0xcA8Fa8f0b631EcdB18Cda619C4Fc9d197c8aFfCa';
export const RICH_ETH_DAI_ADDRESS = '0x16463c0fdB6BA9618909F5b120ea1581618C1b9E';
export const RICH_KP3R_WETH_POOL_ADDRESS = '0x2269522ad48aeb971b25042471a44acc8c1b5eca';
export const KP3R_WETH_POOL_ADDRESS = '0xaf988afF99d3d0cb870812C325C588D8D8CB7De8';
export const UNISWAP_V2_ROUTER_02_ADDRESS = '0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D';
export const UNISWAP_V2_FACTORY_ADDRESS = '0x5C69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6f';
export const DAI_ADDRESS = '0x6B175474E89094C44Da98b954EedeAC495271d0F';
export const KP3R_V1_ADDRESS = '0x1cEB5cB57C4D4E2b2433641b95Dd330A33185A44';
export const KP3R_V1_GOVERNANCE_ADDRESS = '0x0d5dc686d0a2abbfdafdfb4d0533e886517d4e83';

export async function setupKeep3r(governance: SignerWithAddress): Promise<{
  keep3rV1: IKeep3rV1;
  keep3rV1Proxy: Keep3rV1Proxy;
}> {
  // get Keep3rV1 and it's governance
  const keep3rV1 = (await ethers.getContractAt('IKeep3rV1', KP3R_V1_ADDRESS)) as IKeep3rV1;
  const keep3rV1Governance = await wallet.impersonate(KP3R_V1_GOVERNANCE_ADDRESS);

  // deploy proxy
  const keep3rV1Proxy = await ((await ethers.getContractFactory('Keep3rV1Proxy')) as Keep3rV1Proxy__factory).deploy(
    governance.address,
    keep3rV1.address
  );

  // set proxy as Keep3rV1 governance
  await keep3rV1.connect(keep3rV1Governance).setGovernance(keep3rV1Proxy.address, { gasPrice: 0 });
  await keep3rV1Proxy.connect(governance).acceptKeep3rV1Governance();

  // give some eth to Keep3r and to Keep3rV1
  await contracts.setBalance(keep3rV1.address, toUnit(1000));

  return { keep3rV1, keep3rV1Proxy };
}
