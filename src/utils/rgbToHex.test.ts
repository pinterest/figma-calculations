import { figmaRGBToHex } from './rgbToHex';

describe('figmaRGBToHex module', () => {
  test('converts RGB [0, 0, 0] to #000000', () => {
    expect(figmaRGBToHex({ r: 0, g: 0, b: 0 }).toUpperCase()).toBe('#000000');
  });

  test('converts RGBA [0, 0, 0, 0] to #00000000', () => {
    expect(figmaRGBToHex({ r: 0, g: 0, b: 0, a: 0 }).toUpperCase()).toBe('#00000000');
  });

  test('converts RGBA [0, 0, 0, 1] to #000000', () => {
    expect(figmaRGBToHex({ r: 0, g: 0, b: 0, a: 1 }).toUpperCase()).toBe('#000000');
  });

  test('converts RGB [1, 1, 1] to #FFFFFF', () => {
    expect(figmaRGBToHex({ r: 1, g: 1, b: 1 }).toUpperCase()).toBe('#FFFFFF');
  });

  test('converts RGBA [1, 1, 1, 0] to #FFFFFF00', () => {
    expect(figmaRGBToHex({ r: 1, g: 1, b: 1, a: 0 }).toUpperCase()).toBe('#FFFFFF00');
  });

  test('converts RGBA [1, 1, 1, 1] to #FFFFFF', () => {
    expect(figmaRGBToHex({ r: 1, g: 1, b: 1, a: 1 }).toUpperCase()).toBe('#FFFFFF');
  });
});