import fs from "node:fs";
import path from "node:path";
import { PNG } from "../apps/web/node_modules/pngjs/lib/png.js";

const inputPath = "C:\\Users\\krish\\.gemini\\antigravity-ide\\brain\\b5e0aa89-2634-494a-9505-de5044d56e13\\.user_uploaded\\media_1791325278030.png";

const outputDarkPath = path.resolve("apps/web/src/assets/ofd-logo.png");
const outputWhitePath = path.resolve("apps/web/src/assets/ofd-logo-white.png");
const outputPublicPath = path.resolve("apps/web/public/ofd-logo.png");
const outputPublicWhitePath = path.resolve("apps/web/public/ofd-logo-white.png");

fs.mkdirSync(path.dirname(outputDarkPath), { recursive: true });
fs.mkdirSync(path.dirname(outputPublicPath), { recursive: true });

const srcBuffer = fs.readFileSync(inputPath);
const srcPng = PNG.sync.read(srcBuffer);

const darkPng = new PNG({ width: srcPng.width, height: srcPng.height });
const whitePng = new PNG({ width: srcPng.width, height: srcPng.height });

for (let y = 0; y < srcPng.height; y++) {
  for (let x = 0; x < srcPng.width; x++) {
    const idx = (srcPng.width * y + x) << 2;
    const r = srcPng.data[idx];
    const g = srcPng.data[idx + 1];
    const b = srcPng.data[idx + 2];
    const a = srcPng.data[idx + 3];

    const brightness = (r + g + b) / 3;

    if (brightness > 230) {
      // Pure white background -> fully transparent
      darkPng.data[idx] = 0;
      darkPng.data[idx + 1] = 0;
      darkPng.data[idx + 2] = 0;
      darkPng.data[idx + 3] = 0;

      whitePng.data[idx] = 255;
      whitePng.data[idx + 1] = 255;
      whitePng.data[idx + 2] = 255;
      whitePng.data[idx + 3] = 0;
    } else {
      // Dark pixels
      const alphaFactor = Math.min(255, Math.max(0, Math.round(255 - brightness)));
      const finalAlpha = Math.round((a / 255) * alphaFactor);

      // Dark/Original
      darkPng.data[idx] = Math.min(r, 40);
      darkPng.data[idx + 1] = Math.min(g, 40);
      darkPng.data[idx + 2] = Math.min(b, 40);
      darkPng.data[idx + 3] = finalAlpha;

      // Pure White version for dark theme
      whitePng.data[idx] = 255;
      whitePng.data[idx + 1] = 255;
      whitePng.data[idx + 2] = 255;
      whitePng.data[idx + 3] = finalAlpha;
    }
  }
}

const darkBuf = PNG.sync.write(darkPng);
const whiteBuf = PNG.sync.write(whitePng);

fs.writeFileSync(outputDarkPath, darkBuf);
fs.writeFileSync(outputPublicPath, darkBuf);
fs.writeFileSync(outputWhitePath, whiteBuf);
fs.writeFileSync(outputPublicWhitePath, whiteBuf);

console.log("Successfully generated transparent OFD logo files (dark + white).");
