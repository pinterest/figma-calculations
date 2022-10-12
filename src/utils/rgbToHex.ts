const namesRGB = ["r", "g", "b"];

// https://github.com/figma-plugin-helper-functions/figma-plugin-helpers/blob/5f3a767/src/helpers/convertColor.ts#L50

/**
 * this function converts figma color to RGB(A) (array)
 */

// figmaRGBToWebRGB([0.887499988079071, 0.07058823853731155, 0.0665624737739563])
//=> [226, 18, 17]

function figmaRGBToWebRGB(figArray: number[]): any {
  const rgb: number[] = [];

  namesRGB.forEach((e, i) => {
    rgb[i] = Math.round(figArray[i] * 255);
  });

  return rgb;
}

export default function figmaRGBToHex(r: number, g: number, b: number): string {
  let hex = "#";

  const rgb = figmaRGBToWebRGB([r, g, b]);
  hex += ((1 << 24) + (rgb[0] << 16) + (rgb[1] << 8) + rgb[2])
    .toString(16)
    .slice(1);

  if (rgb[3] !== undefined) {
    const a = Math.round(rgb[3] * 255).toString(16);
    if (a.length == 1) {
      hex += "0" + a;
    } else {
      if (a !== "ff") hex += a;
    }
  }

  return hex.toUpperCase();
}
