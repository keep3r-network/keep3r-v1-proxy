import { MockContract, MockContractFactory, smock } from '@defi-wonderland/smock';
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';
import { Keep3rGovernanceForTest, Keep3rGovernanceForTest__factory } from '@types';
import { behaviours, wallet } from '@utils';
import { ZERO_ADDRESS } from '@utils/constants';
import chai, { expect } from 'chai';
import { ethers } from 'hardhat';

chai.use(smock.matchers);

describe('Keep3rGovernance', () => {
  let governable: MockContract<Keep3rGovernanceForTest>;
  let governance: SignerWithAddress;
  let pendingGovernance: SignerWithAddress;
  let governableFactory: MockContractFactory<Keep3rGovernanceForTest__factory>;

  const randomAddress = wallet.generateRandomAddress();

  before(async () => {
    governableFactory = await smock.mock<Keep3rGovernanceForTest__factory>('Keep3rGovernanceForTest');
    [, governance, pendingGovernance] = await ethers.getSigners();
  });

  beforeEach(async () => {
    governable = await governableFactory.deploy(governance.address);

    await governable.setVariable('governance', governance.address);
  });

  describe('setGovernance', () => {
    behaviours.fnShouldOnlyBeCallableByGovernance(() => governable, 'setGovernance', governance, [randomAddress]);

    it('should set pendingGovernance', async () => {
      await governable.connect(governance).setGovernance(randomAddress);
      expect(await governable.pendingGovernance()).to.be.eq(randomAddress);
    });

    it('should emit event', async () => {
      const tx = await governable.connect(governance).setGovernance(randomAddress);
      expect(tx).to.emit(governable, 'GovernanceProposal').withArgs(randomAddress);
    });
  });

  describe('acceptGovernance', () => {
    beforeEach(async () => {
      await governable.setVariable('pendingGovernance', pendingGovernance.address);
    });

    behaviours.fnShouldOnlyBeCallableByPendingGovernance(() => governable, 'acceptGovernance', pendingGovernance, []);

    it('should set governance', async () => {
      await governable.connect(pendingGovernance).acceptGovernance();
      expect(await governable.governance()).to.be.eq(pendingGovernance.address);
    });

    it('should remove pending governance', async () => {
      await governable.connect(pendingGovernance).acceptGovernance();
      expect(await governable.pendingGovernance()).to.be.eq(ZERO_ADDRESS);
    });

    it('should emit event', async () => {
      const tx = await governable.connect(pendingGovernance).acceptGovernance();
      expect(tx).to.emit(governable, 'GovernanceSet').withArgs(pendingGovernance.address);
    });
  });
});
