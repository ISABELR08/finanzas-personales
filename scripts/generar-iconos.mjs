// Genera los iconos de la PWA a partir de un SVG. Uso: node scripts/generar-iconos.mjs
// (sharp ya viene instalado como dependencia de Next.js)
import sharp from "sharp";

// Tres barras ascendentes sobre fondo verde. "margen" deja aire alrededor:
// Android recorta los iconos "maskable" en círculo y necesita más margen.
const svg = (redondeo, escala) => `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <rect width="512" height="512" rx="${redondeo}" fill="#059669"/>
  <g transform="translate(256 256) scale(${escala}) translate(-256 -256)" fill="#ffffff">
    <rect x="132" y="272" width="64" height="112" rx="14"/>
    <rect x="224" y="200" width="64" height="184" rx="14"/>
    <rect x="316" y="128" width="64" height="256" rx="14"/>
  </g>
</svg>`;

const salidas = [
  { archivo: "icon-192.png", lado: 192, redondeo: 112, escala: 1 },
  { archivo: "icon-512.png", lado: 512, redondeo: 112, escala: 1 },
  { archivo: "icon-maskable-512.png", lado: 512, redondeo: 0, escala: 0.8 },
  { archivo: "apple-touch-icon.png", lado: 180, redondeo: 0, escala: 0.9 },
];

for (const { archivo, lado, redondeo, escala } of salidas) {
  await sharp(Buffer.from(svg(redondeo, escala)), { density: 300 })
    .resize(lado, lado)
    .png()
    .toFile(`public/icons/${archivo}`);
  console.log("ok", archivo);
}
