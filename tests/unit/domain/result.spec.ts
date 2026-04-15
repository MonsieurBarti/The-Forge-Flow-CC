import { describe, expect, it } from 'vitest';
import { Err, isErr, isOk, match, Ok } from '../../../src/domain/result.js';

describe('Result', () => {
  describe('Ok', () => {
    it('should create an Ok result with data', () => {
      const result = Ok('hello');
      expect(result.ok).toBe(true);
      expect(result.data).toBe('hello');
    });

    it('should identify Ok with isOk', () => {
      expect(isOk(Ok(42))).toBe(true);
      expect(isOk(Err('fail'))).toBe(false);
    });
  });

  describe('Err', () => {
    it('should create an Err result with error', () => {
      const result = Err('something broke');
      expect(result.ok).toBe(false);
      expect(result.error).toBe('something broke');
    });

    it('should identify Err with isErr', () => {
      expect(isErr(Err('fail'))).toBe(true);
      expect(isErr(Ok(42))).toBe(false);
    });
  });

  describe('match', () => {
    it('should call onOk for Ok result', () => {
      const result = Ok(10);
      const output = match(result, {
        onOk: (data) => data * 2,
        onErr: () => -1,
      });
      expect(output).toBe(20);
    });

    it('should call onErr for Err result', () => {
      const result = Err('broken');
      const output = match(result, {
        onOk: () => 'nope',
        onErr: (error) => `error: ${error}`,
      });
      expect(output).toBe('error: broken');
    });
  });
});
