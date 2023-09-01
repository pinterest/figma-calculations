import figmaRGBToHex from './rgbToHex';

describe('figmaRGBToHex module', () => {
    test('converts RGB [0, 0, 0] to #000000', () => {
        expect(figmaRGBToHex(0, 0, 0)).toBe('#000000');
    });

    test('converts RGB [1, 1, 1] to #FFFFFF', () => {
        expect(figmaRGBToHex(1, 1, 1)).toBe('#FFFFFF');
    });
});