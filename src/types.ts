export type ScoreVerdict = 'TRUSTED_AGENT' | 'REVIEW_ADVISED' | 'HIGH_RISK';
export type ChainId = 'base' | 'ethereum' | 'arbitrum' | 'optimism';

export interface ScoreDimensions {
  TX_VOLUME: number;
  COUNTERPARTY_DIV: number;
  ACCOUNT_AGE: number;
  REPAYMENT_HIST: number;
  EXPLOIT_EXPOSURE: number;
  PROMPT_INTEGRITY: number;
  PEER_ENDORSEMENT: number;
}

export interface ScoreResponse {
  address: string;
  score: number;
  verdict: ScoreVerdict;
  chain: ChainId;
  block: number;
  passport: string;
  dimensions: ScoreDimensions;
  cached_at: string;
}

export interface VerifyResponse {
  address: string;
  verified: boolean;
  passport: string;
  registered_at: string | null;
  chain: ChainId;
  block: number;
}

export interface SpecterClientOptions {
  /** Base URL for the SPECTER API. Defaults to https://api.askspecter.xyz/v1 */
  baseUrl?: string;
  /** API key for higher-tier rate limits */
  apiKey?: string;
  /** Request timeout in milliseconds. Defaults to 10000 */
  timeout?: number;
  /** Default chain to query. Defaults to 'base' */
  chain?: ChainId;
}

export interface TrustGateOptions {
  /** Minimum composite score (0–100). Defaults to 75 */
  minScore?: number;
  /** Require ERC-8004 on-chain identity verification. Defaults to false */
  requireVerified?: boolean;
  /** Per-dimension minimum score requirements */
  dimensions?: Partial<Record<keyof ScoreDimensions, number>>;
}

export interface TrustGateResult {
  /** Whether the agent passed all trust requirements */
  allowed: boolean;
  /** Composite reputation score (0–100) */
  score: number;
  /** Score verdict classification */
  verdict: ScoreVerdict;
  /** Reasons the gate blocked; empty array when allowed */
  failReasons: string[];
}
