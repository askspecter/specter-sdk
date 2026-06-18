export { SpecterClient } from './client.js';
export { SpecterMockClient } from './mock.js';
export {
  SpecterError,
  SpecterNetworkError,
  SpecterRateLimitError,
  SpecterInvalidAddressError,
} from './errors.js';
export type {
  ScoreResponse,
  VerifyResponse,
  SpecterClientOptions,
  ScoreDimensions,
  ScoreVerdict,
  ChainId,
  TrustGateOptions,
  TrustGateResult,
} from './types.js';
