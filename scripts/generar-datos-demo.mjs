// Convierte el CSV de ejemplo del análisis en el JSON que usa la demo pública
// de la app (/demo). Así la app y el notebook muestran los MISMOS datos inventados.
// Uso: node scripts/generar-datos-demo.mjs
import { readFileSync, writeFileSync } from "node:fs";
import Papa from "papaparse";

const csv = readFileSync("analysis/data/ejemplo/movimientos_ejemplo.csv", "utf8");
const { data } = Papa.parse(csv, { header: true, skipEmptyLines: true });

const vistos = new Set();
const movimientos = [];
for (const fila of data) {
  const clave = JSON.stringify(fila);
  if (vistos.has(clave)) continue; // el CSV trae un duplicado a propósito (ver notebook)
  vistos.add(clave);
  movimientos.push({
    id: `demo-${movimientos.length + 1}`,
    fecha: fila.fecha,
    tipo: fila.tipo,
    monto: Number(fila.monto),
    categoria: fila.categoria.trim().toLowerCase(), // se empareja por nombre en src/lib/demo
    descripcion: fila.descripcion || null,
    metodo_pago: fila.metodo_pago || null,
    origen: fila.origen,
  });
}

writeFileSync("src/lib/demo/movimientos.json", JSON.stringify(movimientos));
console.log(movimientos.length, "movimientos de demo");
