1. Install Dependecies
mkdir team-token-locker
cd team-token-locker
npm init -y
npm install --save-dev hardhat @nomicfoundation/hardhat-toolbox
npm install @openzeppelin/contracts dotenv

2. Initialize Hardhat
npx hardhat init
# Choose: Create a JavaScript project

3. Setup Environment
Create a .env file and fill it with your MetaMask private key and the RPC URL.
Get Sepolia ETH from the faucet: https://sepoliafaucet.com
Obtain an Infura API key from: https://infura.io

4 Run local test
npx hardhat test

-> output expected 
TeamTokenLocker
  Vesting Creation
    ✓ Should create vesting schedule correctly
    ✓ Should not allow duplicate vesting
  Token Release
    ✓ Should not release before cliff
    ✓ Should release tokens after cliff
    ✓ Should release all tokens after vesting period
    ✓ Should calculate linear vesting correctly
  Revoke Vesting
    ✓ Should allow owner to revoke vesting
    ✓ Should not allow release after revoke

8 passing (2s)

5.Deploy Contracts
npx hardhat run scripts/deploy.js --network sepolia

6. Update Front end
   Copy the address from the deployment output, then paste it into frontend/app.js under the variables LOCKER_ADDRESS and TOKEN_ADDRESS.

7. Create Vesting Schedule
# Edit beneficiary address scripts/createVesting.js
npx hardhat run scripts/createVesting.js --network sepolia

8. Run Front end
cd frontend
python -m http.server 8000

9. Test in the Browser

Open http://localhost:8000
Connect MetaMask (make sure you’re on the Sepolia network)
View your vesting schedule
Try claiming tokens (it will fail if the cliff period hasn’t passed)”**


10. Verify etherscan
npx hardhat verify --network sepolia LOCKER_ADDRESS "TOKEN_ADDRESS"
npx hardhat verify --network sepolia TOKEN_ADDRESS
