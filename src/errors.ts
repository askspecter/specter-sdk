export class SpecterError extends Error {
  readonly code: string;

  constructor(message: string, code: string) {
    super(message);
    this.name = 'SpecterError';
    this.code = code;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class SpecterNetworkError extends SpecterError {
  constructor(message: string) {
    super(message, 'NETWORK_ERROR');
    this.name = 'SpecterNetworkError';
  }
}

export class SpecterRateLimitError extends SpecterError {
  readonly retryAfter: number;

  constructor(retryAfter: number) {
    super(`Rate limit exceeded. Retry after ${retryAfter}s`, 'RATE_LIMIT');
    this.name = 'SpecterRateLimitError';
    this.retryAfter = retryAfter;
  }
}

export class SpecterInvalidAddressError extends SpecterError {
  constructor(address: string) {
    super(`Invalid Ethereum address: "${address}"`, 'INVALID_ADDRESS');
    this.name = 'SpecterInvalidAddressError';
  }
}
