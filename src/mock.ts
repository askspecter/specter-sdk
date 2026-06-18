import { createHash } from 'node:crypto';
import type {
  ScoreResponse,
  VerifyResponse,
  SpecterClientOptions,
  TrustGateOptions,
  TrustGateResult,
  ScoreDimensions,
  ChainId,
} from './types.js';
import { SpecterInvalidAddressError } from './errors.js';

const ADDRESS_RE = /^0x[0-9a-fA-F]{40}$/;
const DIMS: (keyof ScoreDimensions)[] = [
  'TX_VOLUME',
  'COUNTERPARTY_DIV',
  'ACCOUNT_AGE',
  'REPAYMENT_HIST',
  'EXPLOIT_EXPOSURE',
  'PROMPT_INTEGRITY',
  'PEER_ENDORSEMENT',
];

function deterministicScore(address: string, dimension: string): number {
  const hex = createHash('sha256')
    .update(`${address.toLowerCase()}-${dimension}`)
    .digest('hex');
  return 55 + (parseInt(hex.slice(0, 8), 16) % 41);
}

function getVerdict(score: number): 'TRUSTED_AGENT' | 'REVIEW_ADVISED' | 'HIGH_RISK' {
  if (score >= 85) return 'TRUSTED_AGENT';
  if (score >= 65) return 'REVIEW_ADVISED';
  return 'HIGH_RISK';
}

/**
 * Drop-in replacement for SpecterClient — no network calls.
 * Uses SHA-256 hashing for deterministic, reproducible scores.
 * Ideal for unit tests and local development.
 */
export class SpecterMockClient {
  readonly chain: ChainId;

  constructor(options: SpecterClientOptions = {}) {
    this.chain = options.chain ?? 'base';
  }

  async score(address: string): Promise<ScoreResponse> {
    if (!ADDRESS_RE.test(address)) throw new SpecterInvalidAddressError(address);

    const dimensions = Object.fromEntries(
      DIMS.map(d => [d, deterministicScore(address, d)]),
    ) as ScoreDimensions;

    const score = Math.round(
      Object.values(dimensions).reduce((a, b) => a + b, 0) / DIMS.length,
    );

    return {
      address,
      score,
      verdict: getVerdict(score),
      chain: this.chain,
      block: 21_847_392,
      passport: `0x${createHash('sha256').update(address.toLowerCase()).digest('hex').slice(0, 40)}`,
      dimensions,
      cached_at: new Date().toISOString(),
    };
  }

  async verify(address: string): Promise<VerifyResponse> {
    if (!ADDRESS_RE.test(address)) throw new SpecterInvalidAddressError(address);

    const hex = createHash('sha256').update(address.toLowerCase()).digest('hex');
    const verified = parseInt(hex.slice(0, 2), 16) > 64;

    return {
      address,
      verified,
      passport: `0x${hex.slice(0, 40)}`,
      registered_at: verified
        ? new Date(Date.now() - 30 * 86_400_000).toISOString()
        : null,
      chain: this.chain,
      block: 21_847_392,
    };
  }

  async trustGate(address: string, options: TrustGateOptions = {}): Promise<TrustGateResult> {
    const { minScore = 75, requireVerified = false, dimensions = {} } = options;

    const [scoreData, verifyData] = await Promise.all([
      this.score(address),
      requireVerified ? this.verify(address) : Promise.resolve(null),
    ]);

    const failReasons: string[] = [];

    if (scoreData.score < minScore) {
      failReasons.push(`Score ${scoreData.score} below minimum ${minScore}`);
    }
    if (requireVerified && verifyData && !verifyData.verified) {
      failReasons.push('ERC-8004 identity not verified');
    }
    for (const [dim, minVal] of Object.entries(dimensions)) {
      const key = dim as keyof typeof scoreData.dimensions;
      const actual = scoreData.dimensions[key];
      if (actual < (minVal as number)) {
        failReasons.push(`${dim} score ${actual} below minimum ${minVal}`);
      }
    }

    return {
      allowed: failReasons.length === 0,
      score: scoreData.score,
      verdict: scoreData.verdict,
      failReasons,
    };
  }
}
