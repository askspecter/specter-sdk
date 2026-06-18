import type {
  ScoreResponse,
  VerifyResponse,
  SpecterClientOptions,
  TrustGateOptions,
  TrustGateResult,
  ChainId,
} from './types.js';
import {
  SpecterError,
  SpecterNetworkError,
  SpecterRateLimitError,
  SpecterInvalidAddressError,
} from './errors.js';

const DEFAULT_BASE_URL = 'https://api.askspecter.xyz/v1';
const DEFAULT_TIMEOUT = 10_000;
const ADDRESS_RE = /^0x[0-9a-fA-F]{40}$/;

export class SpecterClient {
  private readonly baseUrl: string;
  private readonly apiKey: string | undefined;
  private readonly timeout: number;
  readonly chain: ChainId;

  constructor(options: SpecterClientOptions = {}) {
    this.baseUrl = (options.baseUrl ?? DEFAULT_BASE_URL).replace(/\/$/, '');
    this.apiKey = options.apiKey;
    this.timeout = options.timeout ?? DEFAULT_TIMEOUT;
    this.chain = options.chain ?? 'base';
  }

  private validateAddress(address: string): void {
    if (!ADDRESS_RE.test(address)) {
      throw new SpecterInvalidAddressError(address);
    }
  }

  private async request<T>(path: string): Promise<T> {
    const url = `${this.baseUrl}${path}`;
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'User-Agent': '@askspecter/sdk/1.0.0',
    };
    if (this.apiKey) headers['X-API-Key'] = this.apiKey;

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeout);

    try {
      const res = await fetch(url, { headers, signal: controller.signal });
      clearTimeout(timer);

      if (res.status === 429) {
        const retryAfter = Number(res.headers.get('Retry-After') ?? 60);
        throw new SpecterRateLimitError(retryAfter);
      }
      if (!res.ok) {
        const body = await res.text().catch(() => '');
        throw new SpecterError(
          `HTTP ${res.status}: ${body || res.statusText}`,
          'API_ERROR',
        );
      }
      return res.json() as Promise<T>;
    } catch (err) {
      clearTimeout(timer);
      if (err instanceof SpecterError) throw err;
      const e = err as Error;
      if (e.name === 'AbortError' || e.message.includes('abort')) {
        throw new SpecterNetworkError(`Request timed out after ${this.timeout}ms`);
      }
      throw new SpecterNetworkError(e.message);
    }
  }

  async score(address: string): Promise<ScoreResponse> {
    this.validateAddress(address);
    return this.request<ScoreResponse>(`/score/${address}?chain=${this.chain}`);
  }

  async verify(address: string): Promise<VerifyResponse> {
    this.validateAddress(address);
    return this.request<VerifyResponse>(`/verify/${address}?chain=${this.chain}`);
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
