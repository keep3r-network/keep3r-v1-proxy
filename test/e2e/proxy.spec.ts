import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';
import { IKeep3rV1, Keep3rV1Proxy } from '@types';
import { evm, wallet } from '@utils';
import { toUnit } from '@utils/bn';
import { snapshot } from '@utils/evm';
import { expect } from 'chai';
import { ethers } from 'hardhat';
import * as common from './common';

describe('@skip-on-coverage Keep3rV1Proxy', () => {
  let governance: SignerWithAddress;
  let minter: SignerWithAddress;
  let keep3rV1: IKeep3rV1;
  let keep3rV1Proxy: Keep3rV1Proxy;
  let snapshotId: string;

  beforeEach(async () => {
    [, governance, minter] = await ethers.getSigners();

    await evm.reset({
      jsonRpcUrl: process.env.MAINNET_HTTPS_URL,
      blockNumber: common.FORK_BLOCK_NUMBER,
    });

    ({ keep3rV1, keep3rV1Proxy } = await common.setupKeep3r(governance));

    snapshotId = await snapshot.take();
  });

  beforeEach(async () => {
    snapshot.revert(snapshotId);
  });

  it('should be the governance of Keep3rV1', async () => {
    expect(await keep3rV1.callStatic.governance()).to.be.equal(keep3rV1Proxy.address);
  });

  it('should be able to mint KP3Rs to an address as governance', async () => {
    let randomAddress = wallet.generateRandomAddress();
    await keep3rV1Proxy.connect(governance)['mint(address,uint256)'](randomAddress, toUnit(1));

    expect(await keep3rV1.balanceOf(randomAddress)).to.be.equal(toUnit(1));
  });

  it('should be able to mint KP3Rs to minter', async () => {
    const [, minter] = await ethers.getSigners();
    await keep3rV1Proxy.connect(governance).setMinter(minter.address);
    await keep3rV1Proxy.connect(minter)['mint(uint256)'](toUnit(1));

    expect(await keep3rV1.balanceOf(minter.address)).to.be.equal(toUnit(1));
  });
});
