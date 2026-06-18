# @askspecter/sdk

Official TypeScript SDK for the **SPECTER Agent Reputation Protocol** — Know Your Agent (KYA).

Score any Ethereum/Base address across 7 behavioral dimensions, verify ERC-8004 identity passports, and gate autonomous agent actions on trust scores.

[![npm version](https://img.shields.io/npm/v/@askspecter/sdk)](https://www.npmjs.com/package/@askspecter/sdk)
[![License: MIT](https://img.shields.io/badge/License-MIT-red.svg)](LICENSE)

---

## Install

```bash
npm install @askspecter/sdk
```

Or via GitHub (no npm publish needed):

```bash
npm install github:askspecter/specter-sdk
```

---

## Quick Start

```typescript
import { SpecterClient } from '@askspecter/sdk';

const client = new SpecterClient();

// Score an agent
const result = await client.score('0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045');
console.log(result.score);   // 82
console.log(result.verdict); // 'TRUSTED_AGENT'

// Gate a transaction on trust score
const gate = await client.trustGate('0xd8dA...', { minScore: 75 });
if (!gate.allowed) {
  throw new Error(`Blocked: ${gate.failReasons.join(', ')}`);
}
```

---

## API

### `new SpecterClient(options?)`

Calls the live SPECTER API at `https://api.askspecter.xyz/v1`.

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `baseUrl` | `string` | `https://api.askspecter.xyz/v1` | API base URL |
| `apiKey` | `string` | — | API key for higher rate limits |
| `timeout` | `number` | `10000` | Request timeout (ms) |
| `chain` | `ChainId` | `'base'` | Chain to query |

### `new SpecterMockClient(options?)`

Deterministic mock — no network calls. Use for tests and local dev.  
Scores are derived via SHA-256 hashing so they're stable across runs.

---

### `client.score(address)`

Returns a `ScoreResponse` with composite score + all 7 dimensions.

```typescript
const { score, verdict, dimensions, passport } = await client.score('0x...');
```

### `client.verify(address)`

Returns a `VerifyResponse` with ERC-8004 passport verification status.

```typescript
const { verified, passport, registered_at } = await client.verify('0x...');
```

### `client.trustGate(address, options?)`

Composite gate check — fails fast with reasons.

```typescript
const gate = await client.trustGate('0x...', {
  minScore: 75,
  requireVerified: true,
  dimensions: {
    PROMPT_INTEGRITY: 70,
    EXPLOIT_EXPOSURE: 65,
  },
});

if (!gate.allowed) {
  console.log(gate.failReasons); // ['Score 62 below minimum 75']
}
```

---

## Score Bands

| Score | Verdict | Meaning |
|-------|---------|---------|
| 85–100 | `TRUSTED_AGENT` | Safe to transact |
| 65–84 | `REVIEW_ADVISED` | Proceed with caution |
| 0–64 | `HIGH_RISK` | Do not delegate |

---

## Testing Without a Real API

```typescript
import { SpecterMockClient } from '@askspecter/sdk';

const client = new SpecterMockClient();
const result = await client.score('0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045');
// Always returns the same score for the same address
```

---

## Running Tests

```bash
npm install
npm test
```

No API key or network access required — all tests use `SpecterMockClient`.

---

## 7 Scoring Dimensions

| Key | Description |
|-----|-------------|
| `TX_VOLUME` | Transaction throughput & consistency |
| `COUNTERPARTY_DIV` | Diversity of counterparties & contract types |
| `ACCOUNT_AGE` | Time since first on-chain activity |
| `REPAYMENT_HIST` | Repayment history on lending protocols |
| `EXPLOIT_EXPOSURE` | Interactions with flagged/malicious contracts |
| `PROMPT_INTEGRITY` | Prompt injection resistance |
| `PEER_ENDORSEMENT` | Agent-to-agent trust endorsements |

---

## License

MIT © [SPECTER Protocol](https://askspecter.lol)
