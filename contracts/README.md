## Solidity + Ganache Integration Notes

This phase adds:
- `contracts/UserRegistry.sol`
- `contracts/MedicineTracking.sol`
- `script/compile-contracts.ts`
- `script/deploy-ganache.ts`

### Compile
Run:
`npm run contracts:compile`

Artifacts are written to:
- `contracts/artifacts/UserRegistry.json`
- `contracts/artifacts/MedicineTracking.json`

Each artifact contains:
- `abi`
- `bytecode`

### Deploy to Ganache
Set environment variables:
- `GANACHE_RPC_URL` (optional, defaults to `http://127.0.0.1:8545`)
- `DEPLOYER_PRIVATE_KEY` (required)

Run:
`npm run contracts:deploy:ganache`

Deployment output is written to:
- `contracts/deployments/ganache.json`

### How to connect contracts to the existing app (backend-first)
Do not wire frontend yet. In backend services:
1. Load contract addresses from `contracts/deployments/ganache.json`.
2. Load ABIs from `contracts/artifacts/*.json`.
3. Create ethers contract instances:
   - `new ethers.Contract(userRegistryAddress, userRegistryAbi, signerOrProvider)`
   - `new ethers.Contract(medicineTrackingAddress, medicineTrackingAbi, signerOrProvider)`
4. Map existing API actions to contract methods:
   - user approval/registration -> `UserRegistry`
   - product/batch/status/transfer operations -> `MedicineTracking`

Recommended env variables for backend wiring:
- `USER_REGISTRY_ADDRESS`
- `MEDICINE_TRACKING_ADDRESS`
- `GANACHE_RPC_URL`
- `CHAIN_ID`
