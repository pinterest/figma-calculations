//stackoverflow.com/questions/5623838/rgb-to-hex-and-hex-to-rgb
export default function rgbToHex(r: number, g: number, b: number) {
  return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
}
