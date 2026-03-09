// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract UserRegistry {
    enum Role {
        None,
        Admin,
        MaterialDistributor,
        Manufacturer,
        Distributor,
        Pharmacy,
        Customer
    }

    struct UserProfile {
        uint256 userId;
        Role role;
        bool isApproved;
        string organization;
        string metadataUri;
        uint256 createdAt;
        uint256 updatedAt;
    }

    address public owner;
    mapping(address => UserProfile) private profiles;
    mapping(uint256 => address) public walletByUserId;

    event UserRegistered(
        address indexed account,
        uint256 indexed userId,
        Role role,
        string organization
    );
    event UserApprovalUpdated(address indexed account, bool isApproved);
    event UserMetadataUpdated(address indexed account, string metadataUri);
    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);

    modifier onlyOwner() {
        require(msg.sender == owner, "only owner");
        _;
    }

    modifier onlyRegistered(address account) {
        require(profiles[account].role != Role.None, "user not registered");
        _;
    }

    constructor() {
        owner = msg.sender;
    }

    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "invalid owner");
        address previousOwner = owner;
        owner = newOwner;
        emit OwnershipTransferred(previousOwner, newOwner);
    }

    function registerUser(
        address account,
        uint256 userId,
        Role role,
        string calldata organization,
        string calldata metadataUri
    ) external onlyOwner {
        require(account != address(0), "invalid account");
        require(role != Role.None, "invalid role");
        require(userId > 0, "invalid user id");
        require(profiles[account].role == Role.None, "already registered");
        require(walletByUserId[userId] == address(0), "user id already linked");

        profiles[account] = UserProfile({
            userId: userId,
            role: role,
            isApproved: role == Role.Customer,
            organization: organization,
            metadataUri: metadataUri,
            createdAt: block.timestamp,
            updatedAt: block.timestamp
        });
        walletByUserId[userId] = account;

        emit UserRegistered(account, userId, role, organization);
    }

    function setApproval(address account, bool approved)
        external
        onlyOwner
        onlyRegistered(account)
    {
        profiles[account].isApproved = approved;
        profiles[account].updatedAt = block.timestamp;
        emit UserApprovalUpdated(account, approved);
    }

    function updateMetadata(address account, string calldata metadataUri)
        external
        onlyOwner
        onlyRegistered(account)
    {
        profiles[account].metadataUri = metadataUri;
        profiles[account].updatedAt = block.timestamp;
        emit UserMetadataUpdated(account, metadataUri);
    }

    function getProfile(address account)
        external
        view
        returns (UserProfile memory)
    {
        return profiles[account];
    }

    function isApproved(address account) external view returns (bool) {
        return profiles[account].isApproved;
    }

    function roleOf(address account) external view returns (Role) {
        return profiles[account].role;
    }
}
