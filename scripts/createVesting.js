const hre = require("hardhat");
const fs = require('fs');

async function main() {
  // Load deployed addresses
  const addresses = JSON.parse(fs.readFileSync('deployed-addresses.json', 'utf8'));
  
  console.log("🔐 Creating Vesting Schedule...\n");

  const [deployer] = await hre.ethers.getSigners();
  
  // Ganti dengan address beneficiary yang ingin diberi vesting
  const BENEFICIARY_ADDRESS = "0xYourBeneficiaryAddressHere";
  const VESTING_AMOUNT = hre.ethers.parseEther("1000000"); // 1 juta tokens

  // Get contracts
  const token = await hre.ethers.getContractAt("TestToken", addresses.token);
  const locker = await hre.ethers.getContractAt("TeamTokenLocker", addresses.locker);

  console.log("📋 Vesting Details:");
  console.log("Beneficiary:", BENEFICIARY_ADDRESS);
  console.log("Amount:", hre.ethers.formatEther(VESTING_AMOUNT), "TTT");
  console.log("Cliff:", "1 year");
  console.log("Vesting:", "4 years linear");

  // Approve token
  console.log("\n1️⃣ Approving tokens...");
  const approveTx = await token.approve(addresses.locker, VESTING_AMOUNT);
  await approveTx.wait();
  console.log("✅ Tokens approved");

  // Create vesting
  console.log("\n2️⃣ Creating vesting schedule...");
  const vestingTx = await locker.createVesting(BENEFICIARY_ADDRESS, VESTING_AMOUNT);
  await vestingTx.wait();
  console.log("✅ Vesting schedule created!");

  // Get vesting info
  const info = await locker.getVestingInfo(BENEFICIARY_ADDRESS);
  console.log("\n📊 Vesting Info:");
  console.log("Total Amount:", hre.ethers.formatEther(info[0]), "TTT");
  console.log("Start Time:", new Date(Number(info[4]) * 1000).toLocaleString());
  console.log("Cliff End:", new Date(Number(info[5]) * 1000).toLocaleString());
  console.log("Vesting End:", new Date(Number(info[6]) * 1000).toLocaleString());
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
