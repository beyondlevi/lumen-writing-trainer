// Renders the monochrome app icon (white glyph on a transparent background,
// as the Meta docs recommend for glasses icons) into public/icon-*.png:
// a pencil writing, with a star.
// Usage: npm run icons
import path from 'node:path';
import sharp from 'sharp';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');

const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <g fill="#ffffff">
    <!-- pencil, from the bottom left up to the right -->
    <path d="M318 150l60 60-178 178-84 24 24-84z"/>
    <path d="M338 130l26-26a28 28 0 0 1 40 0l20 20a28 28 0 0 1 0 40l-26 26z"/>
    <!-- the line it wrote -->
    <rect x="64" y="440" width="200" height="24" rx="12"/>
    <!-- star -->
    <path d="M404 238l15 31 34 5-25 24 6 34-30-16-30 16 6-34-25-24 34-5z"/>
  </g>
</svg>`;

for (const size of [192, 512]) {
  const out = path.join(root, 'public', `icon-${size}.png`);
  await sharp(Buffer.from(svg)).resize(size, size).png().toFile(out);
  console.log(`icon: ${path.relative(root, out)}`);
}
