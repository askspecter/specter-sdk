import { SpecterClient, SpecterMockClient } from '../src/index.js';

// Production: SpecterClient calls the real API
// Development/testing: SpecterMockClient is deterministic, no network needed
const client = process.env.SPECTER_API_KEY
  ? new SpecterClient({ apiKey: process.env.SPECTER_API_KEY })
  : new SpecterMockClient();

const ADDRESS = '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045';

async function main() {
  console.log('Fetching SPECTER score...\n');

  const result = await client.score(ADDRESS);

  console.log(`Address  : ${result.address}`);
  console.log(`Score    : ${result.score}/100`);
  console.log(`Verdict  : ${result.verdict}`);
  console.log(`Passport : ${result.passport}`);
  console.log(`Chain    : ${result.chain} @ block #${result.block.toLocaleString()}`);
  console.log('\nDimension Breakdown:');

  for (const [dim, val] of Object.entries(result.dimensions)) {
    const filled = Math.round(val / 10);
    const bar = '█'.repeat(filled) + '░'.repeat(10 - filled);
    console.log(`  ${dim.padEnd(20)} ${bar}  ${val}`);
  }
}

main().catch(console.error);
