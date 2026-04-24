import { expect } from "@playwright/test";

function clampRgbChannel(value: number) {
  return Math.min(255, Math.max(0, Math.round(value)));
}

function parseRgbChannel(value: string) {
  const numericValue = Number.parseFloat(value);
  if (value.trim().endsWith("%")) {
    return clampRgbChannel((numericValue / 100) * 255);
  }
  return clampRgbChannel(numericValue);
}

function parseHueDegrees(value: string) {
  const numericValue = Number.parseFloat(value);
  if (value.endsWith("turn")) return numericValue * 360;
  if (value.endsWith("grad")) return numericValue * 0.9;
  if (value.endsWith("rad")) return numericValue * (180 / Math.PI);
  return numericValue;
}

function linearSrgbToChannel(value: number) {
  const clampedValue = Math.min(1, Math.max(0, value));
  const gammaCorrected =
    clampedValue <= 0.0031308
      ? clampedValue * 12.92
      : 1.055 * clampedValue ** (1 / 2.4) - 0.055;
  return clampRgbChannel(gammaCorrected * 255);
}

function parseOklchChannels(color: string) {
  const match = color.match(
    /^oklch\(\s*([+-]?(?:\d+\.?\d*|\.\d+)%?)\s+([+-]?(?:\d+\.?\d*|\.\d+)%?)\s+([+-]?(?:\d+\.?\d*|\.\d+)(?:deg|grad|rad|turn)?)\s*(?:\/\s*[^)]+)?\)$/i,
  );
  if (!match) return null;

  const lightness = match[1].endsWith("%")
    ? Number.parseFloat(match[1]) / 100
    : Number.parseFloat(match[1]);
  const chroma = match[2].endsWith("%")
    ? (Number.parseFloat(match[2]) / 100) * 0.4
    : Number.parseFloat(match[2]);
  const hueRadians = (parseHueDegrees(match[3]) * Math.PI) / 180;
  const a = chroma * Math.cos(hueRadians);
  const b = chroma * Math.sin(hueRadians);

  const lPrime = lightness + 0.3963377774 * a + 0.2158037573 * b;
  const mPrime = lightness - 0.1055613458 * a - 0.0638541728 * b;
  const sPrime = lightness - 0.0894841775 * a - 1.291485548 * b;
  const l = lPrime ** 3;
  const m = mPrime ** 3;
  const s = sPrime ** 3;

  return [
    linearSrgbToChannel(4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s),
    linearSrgbToChannel(-1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s),
    linearSrgbToChannel(-0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s),
  ];
}

function parseRgbChannels(color: string) {
  const value = String(color).trim();
  const rgbMatch = value.match(/^rgba?\((.+)\)$/i);
  if (rgbMatch) {
    const channels = rgbMatch[1]
      .replace(/\s*\/\s*[^,)\s]+$/, "")
      .split(/[,\s]+/)
      .filter(Boolean)
      .slice(0, 3)
      .map(parseRgbChannel);

    if (channels.length === 3) {
      return channels;
    }
  }

  const oklchChannels = parseOklchChannels(value);
  if (oklchChannels) {
    return oklchChannels;
  }

  throw new Error(`Unsupported color format: ${color}`);
}

export function expectColorsClose(
  received: string,
  expected: string,
  tolerance = 1,
) {
  const receivedChannels = parseRgbChannels(received);
  const expectedChannels = parseRgbChannels(expected);

  receivedChannels.forEach((channel, index) => {
    expect(Math.abs(channel - expectedChannels[index])).toBeLessThanOrEqual(
      tolerance,
    );
  });
}
