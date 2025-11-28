import { vi } from 'vitest';

export default {
  post: vi.fn(),
  get: vi.fn(),
  create: vi.fn(() => ({
    post: vi.fn(),
    get: vi.fn()
  }))
};
