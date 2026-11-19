import { parsePositiveAmount } from './amount.util';

describe('amount.util', () => {
  it('parses integers and decimals with dot or comma', () => {
    expect(parsePositiveAmount('25')).toBe(25);
    expect(parsePositiveAmount('$12.50')).toBe(12.5);
    expect(parsePositiveAmount('1,25')).toBe(1.25);
    expect(parsePositiveAmount('0,25')).toBe(0.25);
    expect(parsePositiveAmount('.50')).toBe(0.5);
  });

  it('parses centavos expressions into dollar decimals', () => {
    expect(parsePositiveAmount('25 centavos')).toBe(0.25);
    expect(parsePositiveAmount('50 ctvs')).toBe(0.5);
    expect(parsePositiveAmount('5 centavo')).toBe(0.05);
    expect(parsePositiveAmount('25c')).toBe(0.25);
  });

  it('rejects zero, negative, or invalid inputs', () => {
    expect(parsePositiveAmount('0')).toBeNull();
    expect(parsePositiveAmount('0 centavos')).toBeNull();
    expect(parsePositiveAmount('-5')).toBeNull();
    expect(parsePositiveAmount('abc')).toBeNull();
  });
});
