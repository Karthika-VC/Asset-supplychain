import fs from "fs/promises";
import path from "path";
import { ethers } from "ethers";

type Artifact = {
  contractName: string;
  abi: unknown;
  bytecode: string;
};

async function readArtifact(name: "UserRegistry" | "MedicineTracking"): Promise<Artifact> {
  const artifactPath = path.join(process.cwd(), "contracts", "artifacts", `${name}.json`);
  const raw = await fs.readFile(artifactPath, "utf8");
  return JSON.parse(raw) as Artifact;
}

async function deployGanache() {
  const rpcUrl = process.env.GANACHE_RPC_URL ?? "http://127.0.0.1:8545";
  const privateKey = process.env.DEPLOYER_PRIVATE_KEY;

  if (!privateKey) {
    throw new Error("DEPLOYER_PRIVATE_KEY is required");
  }

  const provider = new ethers.JsonRpcProvider(rpcUrl);
  const wallet = new ethers.Wallet(privateKey, provider);

  const [userRegistryArtifact, medicineTrackingArtifact] = await Promise.all([
    readArtifact("UserRegistry"),
    readArtifact("MedicineTracking"),
  ]);

  const userRegistryFactory = new ethers.ContractFactory(
    userRegistryArtifact.abi as ethers.InterfaceAbi,
    userRegistryArtifact.bytecode,
    wallet,
  );

  const userRegistry = await userRegistryFactory.deploy();
  await userRegistry.waitForDeployment();
  const userRegistryAddress = await userRegistry.getAddress();

  const medicineTrackingFactory = new ethers.ContractFactory(
    medicineTrackingArtifact.abi as ethers.InterfaceAbi,
    medicineTrackingArtifact.bytecode,
    wallet,
  );

  const medicineTracking = await medicineTrackingFactory.deploy(userRegistryAddress);
  await medicineTracking.waitForDeployment();
  const medicineTrackingAddress = await medicineTracking.getAddress();

  const deployment = {
    network: "ganache",
    chainId: Number((await provider.getNetwork()).chainId),
    deployedAt: new Date().toISOString(),
    deployer: wallet.address,
    contracts: {
      UserRegistry: {
        address: userRegistryAddress,
        artifact: "contracts/artifacts/UserRegistry.json",
      },
      MedicineTracking: {
        address: medicineTrackingAddress,
        artifact: "contracts/artifacts/MedicineTracking.json",
      },
    },
  };

  const outPath = path.join(process.cwd(), "contracts", "deployments", "ganache.json");
  await fs.mkdir(path.dirname(outPath), { recursive: true });
  await fs.writeFile(outPath, JSON.stringify(deployment, null, 2));

  console.log("Deployment complete:");
  console.log(`- UserRegistry: ${userRegistryAddress}`);
  console.log(`- MedicineTracking: ${medicineTrackingAddress}`);
  console.log(`Deployment file: ${path.relative(process.cwd(), outPath)}`);
}

deployGanache().catch((err) => {
  console.error("Ganache deployment failed:", err);
  process.exit(1);
});
