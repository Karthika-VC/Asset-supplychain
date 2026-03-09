// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IUserRegistry {
    enum Role {
        None,
        Admin,
        MaterialDistributor,
        Manufacturer,
        Distributor,
        Pharmacy,
        Customer
    }

    function roleOf(address account) external view returns (Role);
    function isApproved(address account) external view returns (bool);
}

contract MedicineTracking {
    struct Product {
        string productCode;
        string name;
        string genericName;
        address manufacturer;
        bool active;
        uint256 createdAt;
    }

    struct Batch {
        string batchId;
        string productCode;
        uint256 quantity;
        uint256 manufacturedAt;
        uint256 expiryAt;
        address currentOwner;
        string status;
        bool exists;
    }

    struct TransferRecord {
        string batchId;
        address from;
        address to;
        string action;
        uint256 timestamp;
        string txRef;
    }

    address public owner;
    IUserRegistry public registry;

    mapping(string => Product) public products;
    mapping(string => Batch) public batches;
    mapping(string => TransferRecord[]) private batchHistory;

    event ProductRegistered(
        string indexed productCode,
        address indexed manufacturer,
        string name
    );
    event BatchCreated(
        string indexed batchId,
        string indexed productCode,
        address indexed owner,
        uint256 quantity
    );
    event BatchStatusUpdated(
        string indexed batchId,
        string status,
        address indexed updatedBy
    );
    event BatchTransferred(
        string indexed batchId,
        address indexed from,
        address indexed to,
        string action,
        string txRef
    );
    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);

    modifier onlyOwner() {
        require(msg.sender == owner, "only owner");
        _;
    }

    modifier onlyApprovedEntity() {
        require(registry.isApproved(msg.sender), "not approved");
        _;
    }

    modifier onlyManufacturerOrAdmin() {
        IUserRegistry.Role role = registry.roleOf(msg.sender);
        require(
            role == IUserRegistry.Role.Manufacturer ||
                role == IUserRegistry.Role.Admin,
            "only manufacturer or admin"
        );
        _;
    }

    constructor(address userRegistryAddress) {
        require(userRegistryAddress != address(0), "invalid registry");
        owner = msg.sender;
        registry = IUserRegistry(userRegistryAddress);
    }

    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "invalid owner");
        address previousOwner = owner;
        owner = newOwner;
        emit OwnershipTransferred(previousOwner, newOwner);
    }

    function registerProduct(
        string calldata productCode,
        string calldata name,
        string calldata genericName
    ) external onlyApprovedEntity onlyManufacturerOrAdmin {
        require(bytes(productCode).length > 0, "product code required");
        require(bytes(name).length > 0, "name required");
        require(products[productCode].createdAt == 0, "product exists");

        products[productCode] = Product({
            productCode: productCode,
            name: name,
            genericName: genericName,
            manufacturer: msg.sender,
            active: true,
            createdAt: block.timestamp
        });

        emit ProductRegistered(productCode, msg.sender, name);
    }

    function createBatch(
        string calldata batchId,
        string calldata productCode,
        uint256 quantity,
        uint256 manufacturedAt,
        uint256 expiryAt,
        string calldata status,
        string calldata txRef
    ) external onlyApprovedEntity onlyManufacturerOrAdmin {
        require(bytes(batchId).length > 0, "batch id required");
        require(products[productCode].createdAt > 0, "product not found");
        require(batches[batchId].exists == false, "batch exists");
        require(quantity > 0, "invalid quantity");
        require(expiryAt > manufacturedAt, "invalid expiry");

        batches[batchId] = Batch({
            batchId: batchId,
            productCode: productCode,
            quantity: quantity,
            manufacturedAt: manufacturedAt,
            expiryAt: expiryAt,
            currentOwner: msg.sender,
            status: status,
            exists: true
        });

        batchHistory[batchId].push(
            TransferRecord({
                batchId: batchId,
                from: address(0),
                to: msg.sender,
                action: "BATCH_CREATED",
                timestamp: block.timestamp,
                txRef: txRef
            })
        );

        emit BatchCreated(batchId, productCode, msg.sender, quantity);
    }

    function updateBatchStatus(string calldata batchId, string calldata status)
        external
        onlyApprovedEntity
    {
        require(batches[batchId].exists, "batch not found");
        require(
            msg.sender == batches[batchId].currentOwner ||
                msg.sender == owner,
            "not batch owner"
        );

        batches[batchId].status = status;
        emit BatchStatusUpdated(batchId, status, msg.sender);
    }

    function transferBatch(
        string calldata batchId,
        address to,
        string calldata action,
        string calldata txRef
    ) external onlyApprovedEntity {
        require(batches[batchId].exists, "batch not found");
        require(to != address(0), "invalid receiver");
        require(registry.isApproved(to), "receiver not approved");
        require(msg.sender == batches[batchId].currentOwner, "not batch owner");

        address from = batches[batchId].currentOwner;
        batches[batchId].currentOwner = to;

        batchHistory[batchId].push(
            TransferRecord({
                batchId: batchId,
                from: from,
                to: to,
                action: action,
                timestamp: block.timestamp,
                txRef: txRef
            })
        );

        emit BatchTransferred(batchId, from, to, action, txRef);
    }

    function getBatchHistory(string calldata batchId)
        external
        view
        returns (TransferRecord[] memory)
    {
        return batchHistory[batchId];
    }
}
