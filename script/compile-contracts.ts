import fs from "fs/promises";
import path from "path";
import solc from "solc";

type SolcInput = {
  language: "Solidity";
  sources: Record<string, { content: string }>;
  settings: {
    optimizer: { enabled: boolean; runs: number };
    evmVersion?: string;
    outputSelection: Record<string, Record<string, string[]>>;
  };
};

async function compileContracts() {
  const root = process.cwd();
  const contractsDir = path.join(root, "contracts");
  const outDir = path.join(root, "contracts", "artifacts");

  const userRegistryPath = path.join(contractsDir, "UserRegistry.sol");
  const medicineTrackingPath = path.join(contractsDir, "MedicineTracking.sol");

  const [userRegistrySource, medicineTrackingSource] = await Promise.all([
    fs.readFile(userRegistryPath, "utf8"),
    fs.readFile(medicineTrackingPath, "utf8"),
  ]);

  const input: SolcInput = {
    language: "Solidity",
    sources: {
      "UserRegistry.sol": { content: userRegistrySource },
      "MedicineTracking.sol": { content: medicineTrackingSource },
    },
    settings: {
      optimizer: {
         enabled: true, 
          runs: 200 
      },
      evmVersion: "paris",
      outputSelection: {
        "*": {
          "*": ["abi", "evm.bytecode.object"],
        },
      },
    },
  };

  const rawOutput = solc.compile(JSON.stringify(input));
  const output = JSON.parse(rawOutput) as {
    errors?: Array<{ severity: string; formattedMessage: string }>;
    contracts?: Record<string, Record<string, { abi: unknown; evm: { bytecode: { object: string } } }>>;
  };

  if (output.errors?.length) {
    const messages = output.errors.map((e) => e.formattedMessage).join("\n");
    const hasError = output.errors.some((e) => e.severity === "error");
    if (hasError) {
      throw new Error(messages);
    }
    console.warn(messages);
  }

  if (!output.contracts) {
    throw new Error("No contracts output from solc");
  }

  await fs.mkdir(outDir, { recursive: true });

  for (const [fileName, contracts] of Object.entries(output.contracts)) {
    for (const [contractName, artifact] of Object.entries(contracts)) {
      const artifactPath = path.join(outDir, `${contractName}.json`);
      await fs.writeFile(
        artifactPath,
        JSON.stringify(
          {
            contractName,
            sourceName: fileName,
            abi: artifact.abi,
            bytecode: artifact.evm.bytecode.object,
          },
          null,
          2,
        ),
      );
      console.log(`Wrote artifact: ${path.relative(root, artifactPath)}`);
    }
  }
}

compileContracts().catch((err) => {
  console.error("Contract compilation failed:", err);
  process.exit(1);
});
