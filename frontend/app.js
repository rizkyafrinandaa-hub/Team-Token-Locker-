let web3;
let account;
let lockerContract;
let tokenContract;

// GANTI DENGAN ADDRESS YANG SUDAH DI-DEPLOY
const LOCKER_ADDRESS = 'YOUR_LOCKER_CONTRACT_ADDRESS';
const TOKEN_ADDRESS = 'YOUR_TOKEN_CONTRACT_ADDRESS';

const LOCKER_ABI = [
    {
        "inputs": [{"internalType": "address", "name": "_token", "type": "address"}],
        "stateMutability": "nonpayable",
        "type": "constructor"
    },
    {
        "anonymous": false,
        "inputs": [
            {"indexed": true, "internalType": "address", "name": "beneficiary", "type": "address"},
            {"indexed": false, "internalType": "uint256", "name": "amount", "type": "uint256"}
        ],
        "name": "TokensReleased",
        "type": "event"
    },
    {
        "inputs": [],
        "name": "release",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [{"internalType": "address", "name": "_beneficiary", "type": "address"}],
        "name": "getVestingInfo",
        "outputs": [
            {"internalType": "uint256", "name": "totalAmount", "type": "uint256"},
            {"internalType": "uint256", "name": "releasedAmount", "type": "uint256"},
            {"internalType": "uint256", "name": "releasableAmount", "type": "uint256"},
            {"internalType": "uint256", "name": "vestedAmount", "type": "uint256"},
            {"internalType": "uint256", "name": "startTime", "type": "uint256"},
            {"internalType": "uint256", "name": "cliffEnd", "type": "uint256"},
            {"internalType": "uint256", "name": "vestingEnd", "type": "uint256"},
            {"internalType": "bool", "name": "revoked", "type": "bool"}
        ],
        "stateMutability": "view",
        "type": "function"
    }
];

async function connectWallet() {
    if (typeof window.ethereum !== 'undefined') {
        try {
            web3 = new Web3(window.ethereum);
            const accounts = await ethereum.request({ method: 'eth_requestAccounts' });
            account = accounts[0];
            
            document.getElementById('walletStatus').textContent = 
                `Connected: ${account.substring(0, 6)}...${account.substring(38)}`;
            document.getElementById('connectBtn').textContent = 'Connected ✓';
            document.getElementById('connectBtn').disabled = true;

            lockerContract = new web3.eth.Contract(LOCKER_ABI, LOCKER_ADDRESS);
            
            await loadVestingData();
            showNotification('Wallet connected successfully!', 'success');
        } catch (error) {
            showNotification('Error connecting wallet: ' + error.message, 'error');
        }
    } else {
        showNotification('Please install MetaMask!', 'error');
    }
}

async function loadVestingData() {
    try {
        const info = await lockerContract.methods.getVestingInfo(account).call();
        
        if (info.totalAmount == 0) {
            showNotification('No vesting schedule found for this address', 'error');
            return;
        }

        const totalAmount = web3.utils.fromWei(info.totalAmount, 'ether');
        const vestedAmount = web3.utils.fromWei(info.vestedAmount, 'ether');
        const releasedAmount = web3.utils.fromWei(info.releasedAmount, 'ether');
        const claimableAmount = web3.utils.fromWei(info.releasableAmount, 'ether');
        
        document.getElementById('totalLocked').textContent = formatNumber(totalAmount) + ' TTT';
        document.getElementById('vestedAmount').textContent = formatNumber(vestedAmount) + ' TTT';
        document.getElementById('releasedAmount').textContent = formatNumber(releasedAmount) + ' TTT';
        document.getElementById('claimableAmount').textContent = formatNumber(claimableAmount) + ' TTT';

        // Update progress bar
        const progress = (parseFloat(vestedAmount) / parseFloat(totalAmount)) * 100;
        document.getElementById('progressFill').style.width = progress + '%';
        document.getElementById('progressFill').textContent = progress.toFixed(2) + '%';

        // Update claim button
        if (parseFloat(claimableAmount) > 0) {
            document.getElementById('claimBtn').disabled = false;
        }

        // Generate schedule
        generateSchedule(info);
        
        // Calculate next unlock
        calculateNextUnlock(info);
    } catch (error) {
        console.error('Error loading vesting data:', error);
        showNotification('Error loading vesting data: ' + error.message, 'error');
    }
}

function generateSchedule(info) {
    const startTime = parseInt(info.startTime);
    const cliffEnd = parseInt(info.cliffEnd);
    const vestingEnd = parseInt(info.vestingEnd);
    const totalAmount = parseFloat(web3.utils.fromWei(info.totalAmount, 'ether'));
    const now = Math.floor(Date.now() / 1000);

    const scheduleBody = document.getElementById('scheduleBody');
    scheduleBody.innerHTML = '';

    const milestones = [
        { name: 'Start', date: startTime, amount: 0, status: 'completed' },
        { name: 'Cliff End (1 Year)', date: cliffEnd, amount: totalAmount * 0.25, status: now >= cliffEnd ? 'completed' : 'locked' },
        { name: '2 Years', date: startTime + (730 * 24 * 60 * 60), amount: totalAmount * 0.50, status: now >= (startTime + (730 * 24 * 60 * 60)) ? 'vesting' : 'locked' },
        { name: '3 Years', date: startTime + (1095 * 24 * 60 * 60), amount: totalAmount * 0.75, status: now >= (startTime + (1095 * 24 * 60 * 60)) ? 'vesting' : 'locked' },
        { name: 'Fully Vested (4 Years)', date: vestingEnd, amount: totalAmount, status: now >= vestingEnd ? 'completed' : 'locked' }
    ];

    milestones.forEach(milestone => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td><strong>${milestone.name}</strong></td>
            <td>${new Date(milestone.date * 1000).toLocaleString()}</td>
            <td>${formatNumber(milestone.amount)} TTT</td>
            <td><span class="status-badge status-${milestone.status}">${milestone.status.toUpperCase()}</span></td>
        `;
        scheduleBody.appendChild(row);
    });
}

function calculateNextUnlock(info) {
    const now = Math.floor(Date.now() / 1000);
    const cliffEnd = parseInt(info.cliffEnd);
    const vestingEnd = parseInt(info.vestingEnd);

    if (now < cliffEnd) {
        const timeUntil = cliffEnd - now;
        document.getElementById('nextUnlock').textContent = formatTimeRemaining(timeUntil) + ' (Cliff End)';
    } else if (now < vestingEnd) {
        document.getElementById('nextUnlock').textContent = 'Vesting in progress (Linear unlock)';
    } else {
        document.getElementById('nextUnlock').textContent = 'Fully vested!';
    }
}

async function claimTokens() {
    try {
        document.getElementById('claimBtn').innerHTML = '<span class="loading"></span> Claiming...';
        document.getElementById('claimBtn').disabled = true;

        const tx = await lockerContract.methods.release().send({ from: account });
        
        showNotification('Tokens claimed successfully! TX: ' + tx.transactionHash, 'success');
        
        // Reload data
        await loadVestingData();
        
        document.getElementById('claimBtn').textContent = 'Claim Tokens';
    } catch (error) {
        showNotification('Error claiming tokens: ' + error.message, 'error');
        document.getElementById('claimBtn').textContent = 'Claim Tokens';
        document.getElementById('claimBtn').disabled = false;
    }
}

function formatNumber(num) {
    return parseFloat(num).toLocaleString('en-US', { maximumFractionDigits: 2 });
}

function formatTimeRemaining(seconds) {
    const days = Math.floor(seconds / (24 * 60 * 60));
    const hours = Math.floor((seconds % (24 * 60 * 60)) / (60 * 60));
    return `${days} days, ${hours} hours`;
}

function showNotification(message, type) {
    const notification = document.getElementById('notification');
    notification.textContent = message;
    notification.className = 'notification ' + type;
    notification.style.display = 'block';
    
    setTimeout(() => {
        notification.style.display = 'none';
    }, 5000);
}

// Auto refresh setiap 30 detik
setInterval(() => {
    if (account && lockerContract) {
        loadVestingData();
    }
}, 30000);
