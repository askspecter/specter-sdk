import { SpecterMockClient } from '../src/index.js';

const client = new SpecterMockClient();

async function gateTransaction(agentAddress: string, amountEth: number): Promise<boolean> {
  console.log(`Checking trust gate for ${agentAddress}...`);

  const result = await client.trustGate(agentAddress, {
    minScore: 75,
    requireVerified: false,
    dimensions: {
      PROMPT_INTEGRITY: 70,
      EXPLOIT_EXPOSURE: 65,
    },
  });

  if (!result.allowed) {
    console.error(`\nBLOCKED — score: ${result.score}, verdict: ${result.verdict}`);
    result.failReasons.forEach(r => console.error(`  · ${r}`));
    return false;
  }

  console.log(`\nALLOWED — score: ${result.score}, verdict: ${result.verdict}`);
  console.log(`Proceeding with ${amountEth} ETH transfer`);
  return true;
}

gateTransaction('0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045', 0.5).catch(console.error);
