import { describe, it, expect } from 'vitest';
import { SpecterMockClient } from '../mock.js';
import { SpecterInvalidAddressError } from '../errors.js';

const ADDR = '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045';
const ADDR2 = '0xAbCdEf0123456789AbCdEf0123456789AbCdEf01';
const client = new SpecterMockClient();

describe('SpecterMockClient.score()', () => {
  it('returns valid score for known address', async () => {
    const res = await client.score(ADDR);
    expect(res.address).toBe(ADDR);
    expect(res.score).toBeGreaterThanOrEqual(55);
    expect(res.score).toBeLessThanOrEqual(95);
    expect(['TRUSTED_AGENT', 'REVIEW_ADVISED', 'HIGH_RISK']).toContain(res.verdict);
    expect(res.chain).toBe('base');
    expect(res.block).toBe(21_847_392);
  });

  it('is deterministic across calls', async () => {
    const a = await client.score(ADDR);
    const b = await client.score(ADDR);
    expect(a.score).toBe(b.score);
    expect(a.dimensions).toEqual(b.dimensions);
    expect(a.passport).toBe(b.passport);
  });

  it('produces different scores for different addresses', async () => {
    const a = await client.score(ADDR);
    const b = await client.score(ADDR2);
    expect(JSON.stringify(a.dimensions)).not.toBe(JSON.stringify(b.dimensions));
  });

  it('includes all 7 dimensions within valid range', async () => {
    const res = await client.score(ADDR);
    const expected = [
      'TX_VOLUME', 'COUNTERPARTY_DIV', 'ACCOUNT_AGE', 'REPAYMENT_HIST',
      'EXPLOIT_EXPOSURE', 'PROMPT_INTEGRITY', 'PEER_ENDORSEMENT',
    ] as const;
    for (const dim of expected) {
      expect(res.dimensions[dim]).toBeGreaterThanOrEqual(55);
      expect(res.dimensions[dim]).toBeLessThanOrEqual(95);
    }
  });

  it('verdict is consistent with score value', async () => {
    const res = await client.score(ADDR);
    if (res.score >= 85) expect(res.verdict).toBe('TRUSTED_AGENT');
    else if (res.score >= 65) expect(res.verdict).toBe('REVIEW_ADVISED');
    else expect(res.verdict).toBe('HIGH_RISK');
  });

  it('throws SpecterInvalidAddressError for bad addresses', async () => {
    await expect(client.score('not-an-address')).rejects.toThrow(SpecterInvalidAddressError);
    await expect(client.score('0xinvalid')).rejects.toThrow(SpecterInvalidAddressError);
    await expect(client.score('')).rejects.toThrow(SpecterInvalidAddressError);
    await expect(client.score('0x123')).rejects.toThrow(SpecterInvalidAddressError);
  });
});

describe('SpecterMockClient.verify()', () => {
  it('returns valid verification result', async () => {
    const res = await client.verify(ADDR);
    expect(res.address).toBe(ADDR);
    expect(typeof res.verified).toBe('boolean');
    expect(res.passport).toMatch(/^0x[0-9a-f]{40}$/);
    expect(res.block).toBe(21_847_392);
  });

  it('is deterministic', async () => {
    const a = await client.verify(ADDR);
    const b = await client.verify(ADDR);
    expect(a.verified).toBe(b.verified);
    expect(a.passport).toBe(b.passport);
  });

  it('registered_at is null when not verified', async () => {
    let found = false;
    for (let i = 0; i < 100 && !found; i++) {
      const addr = `0x${i.toString(16).padStart(40, '0')}`;
      const res = await client.verify(addr);
      if (!res.verified) {
        expect(res.registered_at).toBeNull();
        found = true;
      }
    }
  });

  it('throws for invalid address', async () => {
    await expect(client.verify('0xinvalid')).rejects.toThrow(SpecterInvalidAddressError);
  });
});

describe('SpecterMockClient.trustGate()', () => {
  it('allows agent whose score meets threshold', async () => {
    const score = await client.score(ADDR);
    const gate = await client.trustGate(ADDR, { minScore: score.score - 1 });
    expect(gate.allowed).toBe(true);
    expect(gate.failReasons).toHaveLength(0);
    expect(gate.score).toBe(score.score);
  });

  it('blocks agent below minScore', async () => {
    const gate = await client.trustGate(ADDR, { minScore: 200 });
    expect(gate.allowed).toBe(false);
    expect(gate.failReasons.some(r => r.includes('below minimum'))).toBe(true);
  });

  it('blocks on dimension threshold', async () => {
    const gate = await client.trustGate(ADDR, {
      minScore: 0,
      dimensions: { TX_VOLUME: 999 },
    });
    expect(gate.allowed).toBe(false);
    expect(gate.failReasons.some(r => r.includes('TX_VOLUME'))).toBe(true);
  });

  it('uses 75 as default minScore', async () => {
    const score = await client.score(ADDR);
    const gate = await client.trustGate(ADDR);
    expect(gate.allowed).toBe(score.score >= 75);
  });

  it('handles requireVerified: true', async () => {
    const verify = await client.verify(ADDR);
    const gate = await client.trustGate(ADDR, { requireVerified: true, minScore: 0 });
    expect(gate.allowed).toBe(verify.verified);
    if (!verify.verified) {
      expect(gate.failReasons.some(r => r.includes('ERC-8004'))).toBe(true);
    }
  });
});
