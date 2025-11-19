const { expect } = require("chai");
const { ethers } = require("hardhat");
const { time } = require("@nomicfoundation/hardhat-network-helpers");

describe("TeamTokenLocker", function () {
  let token, locker, owner, beneficiary, addr2;
  const VESTING_AMOUNT = ethers.parseEther("1000000");
  const ONE_YEAR = 365 * 24 * 60 * 60;
  const FOUR_YEARS = 4 * ONE_YEAR;

  beforeEach(async function () {
    [owner, beneficiary, addr2] = await ethers.getSigners();

    // Deploy token
    const TestToken = await ethers.getContractFactory("TestToken");
    token = await TestToken.deploy();

    // Deploy locker
    const TeamTokenLocker = await ethers.getContractFactory("TeamTokenLocker");
    locker = await TeamTokenLocker.deploy(await token.getAddress());

    // Approve and create vesting
    await token.approve(await locker.getAddress(), VESTING_AMOUNT);
    await locker.createVesting(beneficiary.address, VESTING_AMOUNT);
  });

  describe("Vesting Creation", function () {
    it("Should create vesting schedule correctly", async function () {
      const info = await locker.getVestingInfo(beneficiary.address);
      expect(info[0]).to.equal(VESTING_AMOUNT);
      expect(info[1]).to.equal(0); // released amount
    });

    it("Should not allow duplicate vesting", async function () {
      await token.approve(await locker.getAddress(), VESTING_AMOUNT);
      await expect(
        locker.createVesting(beneficiary.address, VESTING_AMOUNT)
      ).to.be.revertedWith("Vesting already exists");
    });
  });

  describe("Token Release", function () {
    it("Should not release before cliff", async function () {
      await expect(
        locker.connect(beneficiary).release()
      ).to.be.revertedWith("No tokens available for release");
    });

    it("Should release tokens after cliff", async function () {
      // Fast forward 1.5 years
      await time.increase(ONE_YEAR + (ONE_YEAR / 2));
      
      const balanceBefore = await token.balanceOf(beneficiary.address);
      await locker.connect(beneficiary).release();
      const balanceAfter = await token.balanceOf(beneficiary.address);
      
      expect(balanceAfter).to.be.gt(balanceBefore);
    });

    it("Should release all tokens after vesting period", async function () {
      // Fast forward 4+ years
      await time.increase(FOUR_YEARS + 1);
      
      await locker.connect(beneficiary).release();
      const balance = await token.balanceOf(beneficiary.address);
      
      expect(balance).to.equal(VESTING_AMOUNT);
    });

    it("Should calculate linear vesting correctly", async function () {
      // After 2 years, should have 50% vested
      await time.increase(2 * ONE_YEAR);
      
      const info = await locker.getVestingInfo(beneficiary.address);
      const vestedAmount = info[3];
      const expectedVested = VESTING_AMOUNT / BigInt(2);
      
      // Allow 1% tolerance due to time precision
      const tolerance = VESTING_AMOUNT / BigInt(100);
      expect(vestedAmount).to.be.closeTo(expectedVested, tolerance);
    });
  });

  describe("Revoke Vesting", function () {
    it("Should allow owner to revoke vesting", async function () {
      await time.increase(ONE_YEAR);
      await locker.revokeVesting(beneficiary.address);
      
      const info = await locker.getVestingInfo(beneficiary.address);
      expect(info[7]).to.be.true; // revoked flag
    });

    it("Should not allow release after revoke", async function () {
      await time.increase(FOUR_YEARS);
      await locker.revokeVesting(beneficiary.address);
      
      await expect(
        locker.connect(beneficiary).release()
      ).to.be.revertedWith("Vesting has been revoked");
    });
  });
});
