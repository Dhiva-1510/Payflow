// Mock API module for testing
const mockApi = {
  get: jest.fn(),
  post: jest.fn(),
  put: jest.fn(),
  delete: jest.fn(),
  interceptors: {
    request: { use: jest.fn() },
    response: { use: jest.fn() }
  }
};

export const withRetry = jest.fn((requestFn) => requestFn());
export const requestWithRetry = jest.fn();
export const retryConfig = {
  maxRetries: 3,
  retryDelay: 1000,
  maxDelay: 10000,
  retryableStatuses: [408, 429, 500, 502, 503, 504]
};

export default mockApi;