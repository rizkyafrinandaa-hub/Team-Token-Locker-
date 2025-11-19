// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

contract TeamTokenLocker is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    struct VestingSchedule {
        address beneficiary;
        uint256 totalAmount;
        uint256 startTime;
        uint256 cliffDuration;
        uint256 vestingDuration;
        uint256 releasedAmount;
        bool revoked;
    }

    IERC20 public immutable token;
    uint256 public constant CLIFF_DURATION = 365 days; // 1 tahun cliff
    uint256 public constant VESTING_DURATION = 1460 days; // 4 tahun total
    
    mapping(address => VestingSchedule) public vestingSchedules;
    address[] public beneficiaries;

    event VestingCreated(
        address indexed beneficiary, 
        uint256 amount, 
        uint256 startTime,
        uint256 cliffEnd,
        uint256 vestingEnd
    );
    event TokensReleased(address indexed beneficiary, uint256 amount);
    event VestingRevoked(address indexed beneficiary, uint256 refundAmount);

    constructor(address _token) Ownable(msg.sender) {
        require(_token != address(0), "Invalid token address");
        token = IERC20(_token);
    }

    function createVesting(
        address _beneficiary,
        uint256 _amount
    ) external onlyOwner {
        require(_beneficiary != address(0), "Invalid beneficiary");
        require(_amount > 0, "Amount must be greater than 0");
        require(vestingSchedules[_beneficiary].totalAmount == 0, "Vesting already exists");

        token.safeTransferFrom(msg.sender, address(this), _amount);

        uint256 startTime = block.timestamp;
        
        vestingSchedules[_beneficiary] = VestingSchedule({
            beneficiary: _beneficiary,
            totalAmount: _amount,
            startTime: startTime,
            cliffDuration: CLIFF_DURATION,
            vestingDuration: VESTING_DURATION,
            releasedAmount: 0,
            revoked: false
        });

        beneficiaries.push(_beneficiary);

        emit VestingCreated(
            _beneficiary, 
            _amount, 
            startTime,
            startTime + CLIFF_DURATION,
            startTime + VESTING_DURATION
        );
    }

    function release() external nonReentrant {
        VestingSchedule storage schedule = vestingSchedules[msg.sender];
        require(schedule.totalAmount > 0, "No vesting schedule found");
        require(!schedule.revoked, "Vesting has been revoked");

        uint256 releasable = _releasableAmount(schedule);
        require(releasable > 0, "No tokens available for release");

        schedule.releasedAmount += releasable;
        token.safeTransfer(msg.sender, releasable);

        emit TokensReleased(msg.sender, releasable);
    }

    function _releasableAmount(VestingSchedule memory schedule) 
        private 
        view 
        returns (uint256) 
    {
        return _vestedAmount(schedule) - schedule.releasedAmount;
    }

    function _vestedAmount(VestingSchedule memory schedule) 
        private 
        view 
        returns (uint256) 
    {
        if (block.timestamp < schedule.startTime + schedule.cliffDuration) {
            // Sebelum cliff: tidak ada token yang vested
            return 0;
        } else if (block.timestamp >= schedule.startTime + schedule.vestingDuration) {
            // Setelah vesting selesai: semua token vested
            return schedule.totalAmount;
        } else {
            // Selama vesting: linear release
            uint256 timeVested = block.timestamp - schedule.startTime;
            return (schedule.totalAmount * timeVested) / schedule.vestingDuration;
        }
    }

    function revokeVesting(address _beneficiary) external onlyOwner {
        VestingSchedule storage schedule = vestingSchedules[_beneficiary];
        require(schedule.totalAmount > 0, "No vesting schedule found");
        require(!schedule.revoked, "Already revoked");

        uint256 vested = _vestedAmount(schedule);
        uint256 refund = schedule.totalAmount - vested;

        schedule.revoked = true;

        if (refund > 0) {
            token.safeTransfer(owner(), refund);
        }

        emit VestingRevoked(_beneficiary, refund);
    }

    function getVestingInfo(address _beneficiary) 
        external 
        view 
        returns (
            uint256 totalAmount,
            uint256 releasedAmount,
            uint256 releasableAmount,
            uint256 vestedAmount,
            uint256 startTime,
            uint256 cliffEnd,
            uint256 vestingEnd,
            bool revoked
        ) 
    {
        VestingSchedule memory schedule = vestingSchedules[_beneficiary];
        return (
            schedule.totalAmount,
            schedule.releasedAmount,
            _releasableAmount(schedule),
            _vestedAmount(schedule),
            schedule.startTime,
            schedule.startTime + schedule.cliffDuration,
            schedule.startTime + schedule.vestingDuration,
            schedule.revoked
        );
    }

    function getAllBeneficiaries() external view returns (address[] memory) {
        return beneficiaries;
    }

    function getBeneficiaryCount() external view returns (uint256) {
        return beneficiaries.length;
    }
}
