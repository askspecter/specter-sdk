import { describe, it, expect } from 'vitest';
import {
  SpecterError,
  SpecterNetworkError,
  SpecterRateLimitError,
  SpecterInvalidAddressError,
} from '../errors.js';

describe('SpecterError', () => {
  it('is instanceof Error and SpecterError', () => {
    const err = new SpecterError('msg', 'CODE');
    expect(err).toBeInstanceOf(Error);
    expect(err).toBeInstanceOf(SpecterError);
    expect(err.message).toBe('msg');
    expect(err.code).toBe('CODE');
    expect(err.name).toBe('SpecterError');
  });
});

describe('SpecterNetworkError', () => {
  it('is instanceof SpecterError with correct code', () => {
    const err = new SpecterNetworkError('connection refused');
    expect(err).toBeInstanceOf(SpecterError);
    expect(err.code).toBe('NETWORK_ERROR');
    expect(err.name).toBe('SpecterNetworkError');
    expect(err.message).toBe('connection refused');
  });
});

describe('SpecterRateLimitError', () => {
  it('exposes retryAfter and correct code', () => {
    const err = new SpecterRateLimitError(30);
    expect(err.retryAfter).toBe(30);
    expect(err.code).toBe('RATE_LIMIT');
    expect(err.message).toContain('30');
    expect(err).toBeInstanceOf(SpecterError);
  });
});

describe('SpecterInvalidAddressError', () => {
  it('includes address in message', () => {
    const err = new SpecterInvalidAddressError('0xbad');
    expect(err.message).toContain('0xbad');
    expect(err.code).toBe('INVALID_ADDRESS');
    expect(err).toBeInstanceOf(SpecterError);
  });
});
