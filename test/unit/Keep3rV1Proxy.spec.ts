import IKeep3rV1Artifact from '@contracts/interfaces/IKeep3rV1.sol/IKeep3rV1.json';
import { FakeContract, MockContract, MockContractFactory, smock } from '@defi-wonderland/smock';
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';
import { IKeep3rV1, Keep3rV1Proxy, Keep3rV1Proxy__factory } from '@types';
import { behaviours, wallet } from '@utils';
import { toUnit } from '@utils/bn';
import { ZERO_ADDRESS } from '@utils/constants';
import chai, { expect } from 'chai';
import { ethers } from 'hardhat';

chai.use(smock.matchers);

describe('Keep3rV1Proxy', () => {
  let governance: SignerWithAddress;
  let minter: SignerWithAddress;
  let randomAddress: SignerWithAddress;
  let proxy: MockContract<Keep3rV1Proxy>;
  let keep3rV1: FakeContract<IKeep3rV1>;
  let proxyFactory: MockContractFactory<Keep3rV1Proxy__factory>;

  const randomAddr1 = wallet.generateRandomAddress();
  const randomAddr2 = wallet.generateRandomAddress();

  before(async () => {
    [, governance, minter, randomAddress] = await ethers.getSigners();
    proxyFactory = await smock.mock<Keep3rV1Proxy__factory>('Keep3rV1Proxy');
  });

  beforeEach(async () => {
    keep3rV1 = await smock.fake(IKeep3rV1Artifact);
    proxy = await proxyFactory.deploy(governance.address, keep3rV1.address);
  });

  describe('addRecipient', () => {
    it('should add the address to the list', async () => {
      proxy.connect(governance).addRecipient(randomAddr1, 0);
      expect(await proxy.recipients()).to.deep.equal([randomAddr1]);
    });

    it('should store the amount', async () => {
      proxy.connect(governance).addRecipient(randomAddr1, toUnit(1));
      expect(await proxy.caps(randomAddr1)).to.be.eq(toUnit(1));
    });
  });

  describe('removeRecipient', () => {
    beforeEach(async () => {
      proxy.connect(governance).addRecipient(randomAddr1, toUnit(1));
    });

    it('should add the address to the list', async () => {
      proxy.connect(governance).removeRecipient(randomAddr1);

      expect(await proxy.recipients()).to.deep.equal([]);
    });

    it('should reset the caps amount', async () => {
      proxy.connect(governance).removeRecipient(randomAddr1);

      expect(await proxy.caps(randomAddr1)).to.be.eq(0);
    });
  });

  describe('recipients', () => {
    it('should return full list', async () => {
      proxy.connect(governance).addRecipient(randomAddr1, 0);
      proxy.connect(governance).addRecipient(randomAddr2, 0);

      expect(await proxy.recipients()).to.deep.equal([randomAddr1, randomAddr2]);
    });

    it('should not store duplicates', async () => {
      proxy.connect(governance).addRecipient(randomAddr1, 0);
      proxy.connect(governance).addRecipient(randomAddr2, 0);
      proxy.connect(governance).addRecipient(randomAddr2, 0);

      expect(await proxy.recipients()).to.deep.equal([randomAddr1, randomAddr2]);
    });
  });

  describe('recipientsCaps', () => {
    it('should return an empty array if there are no recipients', async () => {
      expect(await proxy.recipients()).to.deep.equal([]);
    });

    it('should return an array with address and amount for each recipient', async () => {
      proxy.connect(governance).addRecipient(randomAddr1, toUnit(1));
      proxy.connect(governance).addRecipient(randomAddr2, toUnit(2));
      expect(await proxy.recipientsCaps()).to.deep.equal([
        [randomAddr1, toUnit(1)],
        [randomAddr2, toUnit(2)],
      ]);
    });
  });

  describe('draw', () => {
    it('should revert if not enough time has passed', async () => {
      const blockTimestamp = (await ethers.provider.getBlock('latest')).timestamp;
      proxy.setVariable('next', { [randomAddress.address]: blockTimestamp + 10 });

      await expect(proxy.connect(randomAddress).draw()).to.be.revertedWith('Cooldown()');
    });

    it('should revert if caller has not drawable tokens', async () => {
      await expect(proxy.connect(randomAddress).draw()).to.be.revertedWith('NoDrawableAmount()');
    });

    it('should mint and transfer KP3R to caller', async () => {
      const drawAmount = toUnit(1);
      const blockTimestamp = (await ethers.provider.getBlock('latest')).timestamp;
      proxy.setVariable('next', { [randomAddress.address]: blockTimestamp });
      proxy.setVariable('caps', { [randomAddress.address]: drawAmount });

      await proxy.connect(randomAddress).draw();

      expect(keep3rV1.mint).to.have.been.calledWith(drawAmount);
      expect(keep3rV1.transfer).to.have.been.calledWith(randomAddress.address, drawAmount);
    });

    it('should set next draw 1 week after previous draw', async () => {
      const drawAmount = toUnit(1);
      const WEEK = 3600 * 24 * 7;
      const blockTimestamp = (await ethers.provider.getBlock('latest')).timestamp;
      proxy.setVariable('next', { [randomAddress.address]: blockTimestamp });
      proxy.setVariable('caps', { [randomAddress.address]: drawAmount });

      await proxy.connect(randomAddress).draw();

      expect(await proxy.next(randomAddress.address)).to.be.eq(blockTimestamp + WEEK);
    });

    it('should set next draw to next week when previous has expired', async () => {
      const drawAmount = toUnit(1);
      const WEEK = 3600 * 24 * 7;
      proxy.setVariable('caps', { [randomAddress.address]: drawAmount });

      await proxy.connect(randomAddress).draw();
      const blockTimestamp = (await ethers.provider.getBlock('latest')).timestamp;

      expect(await proxy.next(randomAddress.address)).to.be.eq(blockTimestamp + WEEK);
    });

    it('should return the minted amount', async () => {
      const drawAmount = toUnit(1);
      const blockTimestamp = (await ethers.provider.getBlock('latest')).timestamp;
      proxy.setVariable('next', { [randomAddress.address]: blockTimestamp });
      proxy.setVariable('caps', { [randomAddress.address]: drawAmount });

      expect(await proxy.connect(randomAddress).callStatic.draw()).to.be.eq(drawAmount);
    });
  });

  describe('setKeep3rV1', () => {
    behaviours.fnShouldOnlyBeCallableByGovernance(
      () => proxy,
      'setKeep3rV1',
      governance,
      () => [randomAddr1]
    );

    it('should revert when sending zero address', async () => {
      await expect(proxy.connect(governance).setKeep3rV1(ZERO_ADDRESS)).to.be.revertedWith('ZeroAddress()');
    });

    it('should set keep3rV1', async () => {
      await proxy.connect(governance).setKeep3rV1(randomAddress.address);
      expect(await proxy.keep3rV1()).to.equal(randomAddress.address);
    });
  });

  describe('setMinter', () => {
    behaviours.fnShouldOnlyBeCallableByGovernance(
      () => proxy,
      'setMinter',
      governance,
      () => [randomAddr1]
    );

    it('should revert when sending zero address', async () => {
      await expect(proxy.connect(governance).setMinter(ZERO_ADDRESS)).to.be.revertedWith('ZeroAddress()');
    });

    it('should set minter', async () => {
      await proxy.connect(governance).setMinter(randomAddress.address);
      expect(await proxy.minter()).to.equal(randomAddress.address);
    });
  });

  describe('mint(uint256)', () => {
    beforeEach(async () => {
      await proxy.connect(governance).setMinter(minter.address);
    });

    it('should be callable by minter', async () => {
      await expect(proxy.connect(minter)['mint(uint256)'](toUnit(1))).not.to.be.revertedWith('OnlyMinter()');
    });

    it('should not be callable by any address', async () => {
      await expect(proxy['mint(uint256)'](toUnit(1))).to.be.revertedWith('OnlyMinter()');
    });

    it('should call V1 mint', async () => {
      await proxy.connect(minter)['mint(uint256)'](toUnit(1));
      expect(keep3rV1.mint).to.be.calledOnceWith(toUnit(1));
    });

    it('should transfer the minted tokens to minter', async () => {
      await proxy.connect(minter)['mint(uint256)'](toUnit(1));
      expect(keep3rV1.transfer).to.be.calledOnceWith(minter.address, toUnit(1));
    });
  });

  describe('mint(address,uint256)', () => {
    behaviours.fnShouldOnlyBeCallableByGovernance(
      () => proxy,
      'mint(address,uint256)',
      governance,
      () => [randomAddr1, toUnit(1)]
    );

    it('should call V1 mint', async () => {
      await proxy.connect(governance)['mint(address,uint256)'](randomAddress.address, toUnit(1));
      expect(keep3rV1.mint).to.be.calledOnceWith(toUnit(1));
    });

    it('should transfer the minted tokens to provided address', async () => {
      await proxy.connect(governance)['mint(address,uint256)'](randomAddress.address, toUnit(1));
      expect(keep3rV1.transfer).to.be.calledOnceWith(randomAddress.address, toUnit(1));
    });
  });

  [
    { name: 'setKeep3rV1Governance', v1Name: 'setGovernance', args: [randomAddr1] },
    { name: 'acceptKeep3rV1Governance', v1Name: 'acceptGovernance', args: [] },
    { name: 'dispute', v1Name: 'dispute', args: [randomAddr1] },
    { name: 'slash', v1Name: 'slash', args: [randomAddr1, wallet.generateRandomAddress(), toUnit(1)] },
    { name: 'revoke', v1Name: 'revoke', args: [randomAddr1] },
    { name: 'resolve', v1Name: 'resolve', args: [randomAddr1] },
    { name: 'addJob', v1Name: 'addJob', args: [randomAddr1] },
    { name: 'removeJob', v1Name: 'removeJob', args: [randomAddr1] },
    { name: 'addKPRCredit', v1Name: 'addKPRCredit', args: [randomAddr1, toUnit(1)] },
    { name: 'approveLiquidity', v1Name: 'approveLiquidity', args: [randomAddr1] },
    { name: 'revokeLiquidity', v1Name: 'revokeLiquidity', args: [randomAddr1] },
    { name: 'setKeep3rHelper', v1Name: 'setKeep3rHelper', args: [randomAddr1] },
    { name: 'addVotes', v1Name: 'addVotes', args: [randomAddr1, toUnit(1)] },
    { name: 'removeVotes', v1Name: 'removeVotes', args: [randomAddr1, toUnit(1)] },
  ].forEach((method) => {
    describe(method.name, () => {
      behaviours.fnShouldOnlyBeCallableByGovernance(() => proxy, method.name, governance, method.args);

      it('should proxy keep3rV1', async () => {
        await (proxy as any).connect(governance)[method.name](...method.args);
        expect((keep3rV1 as any)[method.v1Name]).to.be.calledOnceWith(...method.args);
      });
    });
  });
});
