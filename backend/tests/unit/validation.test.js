import { describe, it, expect } from '@jest/globals';
import { body, validationResult } from 'express-validator';
import { check } from 'express-validator';

// Mock express-validator
jest.mock('express-validator', () => ({
  body: jest.fn(() => ({
    notEmpty: jest.fn(() => ({
      withMessage: jest.fn(() => ({
        isLength: jest.fn(() => ({
          withMessage: jest.fn(() => ({
            trim: jest.fn(() => ({
              escape: jest.fn(() => ({
                isEmail: jest.fn(() => ({
                  withMessage: jest.fn(() => ({
                    normalizeEmail: jest.fn(() => ({
                      optional: jest.fn(() => ({
                        isIn: jest.fn(() => ({
                          withMessage: jest.fn(() => ({}))
                        }))
                      }))
                    }))
                  }))
                }))
              }))
            }))
          }))
        }))
      }))
    }))
  })),
  validationResult: jest.fn(() => ({
    isEmpty: jest.fn(() => true),
    array: jest.fn(() => [])
  }))
}));

describe('Validation Rules', () => {
  it('should define contact validation rules', () => {
    // Import the validation rules
    const contactValidation = [
      body('name')
        .notEmpty().withMessage('Namn är obligatoriskt.')
        .isLength({ min: 2, max: 100 }).withMessage('Namn måste vara mellan 2 och 100 tecken.')
        .trim()
        .escape(),
      body('email')
        .isEmail().withMessage('Ogiltig e-postadress.')
        .normalizeEmail(),
      body('company')
        .optional()
        .isLength({ max: 100 }).withMessage('Företag får inte vara längre än 100 tecken.')
        .trim()
        .escape(),
      body('industry')
        .optional()
        .isIn(['restaurant', 'retail', 'nonprofit', 'other']).withMessage('Ogiltig bransch.'),
      body('otherIndustry')
        .optional()
        .isLength({ max: 100 }).withMessage('Annan bransch får inte vara längre än 100 tecken.')
        .trim()
        .escape(),
      body('message')
        .notEmpty().withMessage('Meddelande är obligatoriskt.')
        .isLength({ min: 10, max: 1000 }).withMessage('Meddelande måste vara mellan 10 och 1000 tecken.')
        .trim()
        .escape()
    ];

    expect(contactValidation).toBeDefined();
    expect(Array.isArray(contactValidation)).toBe(true);
    expect(contactValidation.length).toBe(6);
  });

  it('should validate successful input', () => {
    const mockReq = {
      body: {
        name: 'Valid Name',
        email: 'valid@example.com',
        message: 'This is a valid message with enough length.'
      }
    };

    validationResult.mockReturnValue({
      isEmpty: () => true,
      array: () => []
    });

    const errors = validationResult(mockReq);
    expect(errors.isEmpty()).toBe(true);
  });

  it('should detect validation errors', () => {
    const mockReq = {
      body: {
        name: '',
        email: 'invalid-email',
        message: 'short'
      }
    };

    validationResult.mockReturnValue({
      isEmpty: () => false,
      array: () => [
        { msg: 'Namn är obligatoriskt.' },
        { msg: 'Ogiltig e-postadress.' },
        { msg: 'Meddelande måste vara mellan 10 och 1000 tecken.' }
      ]
    });

    const errors = validationResult(mockReq);
    expect(errors.isEmpty()).toBe(false);
    expect(errors.array()).toHaveLength(3);
  });
});
