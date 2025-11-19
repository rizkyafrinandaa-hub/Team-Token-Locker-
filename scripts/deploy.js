const hre = require("hardhat");

async function main() {
  console.log("🚀 Deploying Team Token Locker...\n");

  // Deploy TestToken
  console.log("1️⃣ Deploying TestToken...");
  const TestToken = await hre.ethers.getContractFactory("TestToken");
  const token = await TestToken.deploy();
  await token.waitForDeployment();
  const tokenAddress = await token.getAddress();
  console.log("✅ TestToken deployed to:", tokenAddress);

  // Deploy TeamTokenLocker
  console.log("\n2️⃣ Deploying TeamTokenLocker...");
  const TeamTokenLocker = await hre.ethers.getContractFactory("TeamTokenLocker");
  const locker = await TeamTokenLocker.deploy(tokenAddress);
  await locker.waitForDeployment();
  const lockerAddress = await locker.getAddress();
  console.log("✅ TeamTokenLocker deployed to:", lockerAddress);

  // Get deployer info
  const [deployer] = await hre.ethers.getSigners();
  const balance = await token.balanceOf(deployer.address);
  
  console.log("\n📊 Deployment Summary:");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("Token Address:", tokenAddress);
  console.log("Locker Address:", lockerAddress);
  console.log("Deployer:", deployer.address);
  console.log("Token Balance:", hre.ethers.formatEther(balance), "TTT");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

  console.log("\n📝 Next Steps:");
  console.log("1. Copy addresses ke frontend/app.js");
  console.log("2. Approve token untuk locker contract");
  console.log("3. Create vesting schedule dengan createVesting.js");
  
  // Save addresses
  const fs = require('fs');
  const addresses = {
    token: tokenAddress,
    locker: lockerAddress,
    network: hre.network.name
  };
  fs.writeFileSync('deployed-addresses.json', JSON.stringify(addresses, null, 2));
  console.log("\n💾 Addresses saved to deployed-addresses.json");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
