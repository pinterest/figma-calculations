import { rgbaToHex } from './variables';

describe('rgbaToHex', () => {
  test('Converts color RGBA object to hex string', () => {
    const rgba: RGBA = {
      r: 0.8862745098039215,
      g: 0.07058823529411765,
      b: 0.06666666666666667,
      a: 1,
    };
    expect(rgbaToHex(rgba)).toBe('#E21211FF');
  });

  test('Converts white RGBA object to hex string', () => {
    const rgba: RGBA = {
      r: 1,
      g: 1,
      b: 1,
      a: 1,
    };
    expect(rgbaToHex(rgba)).toBe('#FFFFFFFF');
  });

  test('Converts black RGBA object to hex string', () => {
    const rgba: RGBA = {
      r: 0,
      g: 0,
      b: 0,
      a: 1,
    };
    expect(rgbaToHex(rgba)).toBe('#000000FF');
  });

  test('Converts half opacity RGBA object to hex string', () => {
    const rgba: RGBA = {
      r: 0,
      g: 0,
      b: 0,
      a: 0.5,
    };
    expect(rgbaToHex(rgba)).toBe('#00000080');
  });
});
