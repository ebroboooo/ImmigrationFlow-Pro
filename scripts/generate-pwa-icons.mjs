import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const sizes = [192, 256, 384, 512];

const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><defs><linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#4f46e5"/><stop offset="100%" stop-color="#06b6d4"/></linearGradient></defs><rect width="512" height="512" rx="112" fill="url(#g)"/><g fill="#fff"><path d="M256 118c-52 0-94 42-94 94v22h36v-22c0-32 26-58 58-58s58 26 58 58v22h36v-22c0-52-42-94-94-94z" opacity=".95"/><rect x="148" y="234" width="216" height="160" rx="28"/><circle cx="208" cy="314" r="22" fill="#4f46e5"/><circle cx="304" cy="314" r="22" fill="#4f46e5"/><path d="M196 362h120" stroke="#4f46e5" stroke-width="16" stroke-linecap="round"/></g></svg>`;

async function main() {
  const iconsDir = join(root, 'public', 'icons');
  await mkdir(iconsDir, { recursive: true });

  let sharp;
  try {
    sharp = (await import('sharp')).default;
  } catch {
    console.error('Install sharp first: npm install --save-dev sharp');
    process.exit(1);
  }

  for (const size of sizes) {
    const png = await sharp(Buffer.from(svg)).resize(size, size).png().toBuffer();
    await writeFile(join(iconsDir, `icon-${size}.png`), png);
    console.log(`Generated icon-${size}.png`);
  }

  await sharp(Buffer.from(svg)).resize(180, 180).png().toBuffer().then((png) =>
    writeFile(join(iconsDir, 'apple-touch-icon.png'), png),
  );

  console.log('Generated apple-touch-icon.png');
}

main();
