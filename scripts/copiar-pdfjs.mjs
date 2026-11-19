// Copia a public/pdfjs los archivos que pdf.js carga por separado en el
// navegador (su "worker" y los decodificadores de imagen en WebAssembly).
// Corre solo después de cada "npm install" (ver "postinstall" en package.json),
// así siempre coinciden con la versión instalada y no hay que subirlos a git.
import { cpSync, mkdirSync, readdirSync } from "node:fs";

const origen = "node_modules/pdfjs-dist";
const destino = "public/pdfjs";

mkdirSync(`${destino}/wasm`, { recursive: true });
cpSync(`${origen}/build/pdf.worker.min.mjs`, `${destino}/pdf.worker.min.mjs`);
for (const archivo of readdirSync(`${origen}/wasm`)) {
  if (/\.(wasm|js)$/.test(archivo)) {
    cpSync(`${origen}/wasm/${archivo}`, `${destino}/wasm/${archivo}`);
  }
}
console.log("pdf.js copiado a", destino);
