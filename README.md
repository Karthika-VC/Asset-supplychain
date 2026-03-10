# Asset-Linker

Pharma supply-chain tracking app with:
- React dashboards (`client/`)
- Express API (`server/`)
- Shared Drizzle + Zod contracts (`shared/`)
- Solidity contracts + Ganache scripts (`contracts/`, `script/`)

## 1. Prerequisites
- Node.js 20.19+ recommended
- MySQL 8+
- Ganache (for local blockchain testing)

## 2. Environment
Copy `.env.example` to `.env` and set values.

Required:
- `JWT_SECRET`
- `DATABASE_URL` (or `MYSQL_URL`)

Blockchain-related:
- `GANACHE_RPC_URL`
- `DEPLOYER_PRIVATE_KEY`
- optional `USER_REGISTRY_ADDRESS`, `MEDICINE_TRACKING_ADDRESS`, `CHAIN_ID`

## 3. Install and Run
```bash
npm install
npm run db:push
npm run dev
```

## 4. Contracts (Ganache)
Compile:
```bash
npm run contracts:compile
```

Deploy:
```bash
npm run contracts:deploy:ganache
```

Deployment output:
- `contracts/deployments/ganache.json`

Artifacts:
- `contracts/artifacts/UserRegistry.json`
- `contracts/artifacts/MedicineTracking.json`

## 5. Integration Notes
- Auth: JWT-based, role-aware route protection.
- RBAC: enforced in server routes per domain API.
- Drizzle: MySQL driver + schema in `shared/schema.ts`.
- Tx persistence: `txHash`, `chainId`, `blockNumber`, `contractAddress` persisted on material/batch/transfer flows.
- QR flows: implemented on customer, distributor, and pharmacy portals via QR payload parsing + batch lookup.
- Authenticity + feedback: customer/pharmacy workflows wired to `/api/authenticity` and `/api/feedback`.

## 6. Verification Commands
```bash
npm run check
```

If `tsc` passes, TypeScript contracts across client/server/shared are consistent.
