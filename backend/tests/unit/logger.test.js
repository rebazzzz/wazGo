import { describe, it, expect } from '@jest/globals';

import logger from '../../utils/logger.js';

describe('Logger Utility', () => {
  it('should have all required logging methods', () => {
    expect(typeof logger.info).toBe('function');
    expect(typeof logger.error).toBe('function');
    expect(typeof logger.warn).toBe('function');
    expect(typeof logger.debug).toBe('function');
  });
});
