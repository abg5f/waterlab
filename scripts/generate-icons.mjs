import sharp from 'sharp'
import { mkdirSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const outDir = join(__dirname, '..', 'public', 'icons')
mkdirSync(outDir, { recursive: true })

const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <rect width="512" height="512" fill="#080f1e"/>
  <circle cx="256" cy="230" r="200" fill="#00c4d4" opacity="0.07"/>
  <ellipse cx="248" cy="222" rx="130" ry="76" fill="#00c4d4"/>
  <polygon points="378,222 445,162 445,282" fill="#00c4d4"/>
  <ellipse cx="230" cy="238" rx="90" ry="44" fill="#60e8f4" opacity="0.35"/>
  <path d="M 160 222 Q 210 148 280 178 L 280 222 Z" fill="#008fa8"/>
  <circle cx="162" cy="208" r="20" fill="#080f1e"/>
  <circle cx="158" cy="205" r="10" fill="white"/>
  <circle cx="156" cy="203" r="5" fill="#080f1e"/>
  <line x1="60" y1="215" x2="110" y2="215" stroke="#60e8f4" stroke-width="6" stroke-linecap="round" opacity="0.5"/>
  <line x1="50" y1="235" x2="95"  y2="235" stroke="#60e8f4" stroke-width="4" stroke-linecap="round" opacity="0.35"/>
  <path d="M0 370 Q64 330 128 370 Q192 410 256 370 Q320 330 384 370 Q448 410 512 370 L512 512 L0 512Z" fill="#0c1a30"/>
  <path d="M0 410 Q80 370 160 410 Q240 450 320 410 Q400 370 512 400 L512 512 L0 512Z" fill="#00c4d4" opacity="0.18"/>
</svg>`

for (const size of [72, 96, 128, 144, 152, 192, 384, 512]) {
  await sharp(Buffer.from(svg)).resize(size, size).png().toFile(join(outDir, `icon-${size}.png`))
  console.log(`✓ icon-${size}.png`)
}
await sharp(Buffer.from(svg)).resize(512, 512).png().toFile(join(outDir, 'icon-maskable-512.png'))
console.log('✓ icon-maskable-512.png')
