import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import winston from 'winston';
import logger from '../../utils/logger.js';

// Mock winston
jest.mock('winston', () => ({
  createLogger: jest.fn(),
  format: {
    combine: jest.fn(),
    timestamp: jest.fn(),
    printf: jest.fn(),
    colorize: jest.fn(),
    simple: jest.fn(),
  },
  transports: {
    Console: jest.fn(),
    File: jest.fn(),
  },
}));

describe('Logger Utility', () => {
  let mockLogger;

  beforeEach(() => {
    mockLogger = {
      add: jest.fn(),
      info: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
      debug: jest.fn(),
    };
    winston.createLogger.mockReturnValue(mockLogger);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should create a logger instance', () => {
    const loggerInstance = logger;
    expect(winston.createLogger).toHaveBeenCalled();
    expect(loggerInstance).toBeDefined();
  });

  it('should have all required logging methods', () => {
    expect(typeof logger.info).toBe('function');
    expect(typeof logger.error).toBe('function');
    expect(typeof logger.warn).toBe('function');
    expect(typeof logger.debug).toBe('function');
  });

  it('should log info messages', () => {
    logger.info('Test info message', { key: 'value' });
    expect(mockLogger.info).toHaveBeenCalledWith('Test info message', { key: 'value' });
  });

  it('should log error messages', () => {
    const error = new Error('Test error');
    logger.error('Test error message', { error: error.message });
    expect(mockLogger.error).toHaveBeenCalledWith('Test error message', { error: error.message });
  });

  it('should log warning messages', () => {
    logger.warn('Test warning message');
    expect(mockLogger.warn).toHaveBeenCalledWith('Test warning message');
  });

  it('should log debug messages', () => {
    logger.debug('Test debug message', { data: 'test' });
    expect(mockLogger.debug).toHaveBeenCalledWith('Test debug message', { data: 'test' });
  });
});
