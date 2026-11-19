import type { ResultadoLectura } from "./csv";
import { leerTextoSantander, terminoLaTabla } from "./santander-pdf";

const ESCALA = 3; // 3× el tamaño del PDF: letras grandes para el OCR
const UMBRAL_BLANCO = 225; // más claro que esto se considera fondo

/**
 * Lee un estado de cuenta en PDF dentro del navegador, sin subirlo:
 *  1. pdf.js dibuja cada página en un <canvas> (el PDF de Santander son
 *     imágenes, no texto).
 *  2. Se blanquean los fondos grises de la tabla, que confunden al OCR.
 *  3. tesseract.js reconoce el texto de la imagen (OCR).
 *  4. leerTextoSantander convierte ese texto en movimientos.
 * Las dos librerías pesan varios MB, así que se cargan solo al usarlas.
 */
export async function leerPDF(
  bytes: ArrayBuffer,
  alAvanzar: (mensaje: string) => void,
): Promise<ResultadoLectura> {
  alAvanzar("Preparando el lector…");
  const [pdfjs, { createWorker, PSM }] = await Promise.all([
    import("pdfjs-dist"),
    import("tesseract.js"),
  ]);
  // Archivos que scripts/copiar-pdfjs.mjs deja en public/pdfjs al instalar.
  pdfjs.GlobalWorkerOptions.workerSrc = "/pdfjs/pdf.worker.min.mjs";

  let documento;
  try {
    documento = await pdfjs.getDocument({ data: bytes, wasmUrl: "/pdfjs/wasm/" }).promise;
  } catch (error) {
    const conClave = error instanceof Error && error.name === "PasswordException";
    return {
      ok: false,
      error: conClave
        ? "El PDF está protegido con contraseña. Guarda una copia sin contraseña e inténtalo de nuevo."
        : "No pude abrir el archivo. ¿Seguro que es un PDF?",
    };
  }

  const ocr = await createWorker("spa");
  try {
    await ocr.setParameters({
      preserve_interword_spaces: "1",
      tessedit_pageseg_mode: PSM.SINGLE_BLOCK, // la página es un solo bloque de renglones
    });

    let texto = "";
    for (let n = 1; n <= documento.numPages; n++) {
      alAvanzar(`Leyendo página ${n} de ${documento.numPages}…`);
      const pagina = await documento.getPage(n);
      const vista = pagina.getViewport({ scale: ESCALA });
      const lienzo = document.createElement("canvas");
      lienzo.width = Math.floor(vista.width);
      lienzo.height = Math.floor(vista.height);
      await pagina.render({ canvas: lienzo, viewport: vista }).promise;
      blanquearFondo(lienzo);

      const { data } = await ocr.recognize(lienzo);
      texto += data.text + "\n";
      lienzo.width = lienzo.height = 0; // libera memoria (importa en el celular)

      // Tras el renglón TOTAL solo quedan glosario y avisos legales.
      if (terminoLaTabla(texto)) break;
    }
    return leerTextoSantander(texto);
  } finally {
    await ocr.terminate();
    await documento.loadingTask.destroy();
  }
}

/** Convierte a blanco todo píxel claro (bandas grises alternas de la tabla). */
function blanquearFondo(lienzo: HTMLCanvasElement) {
  const contexto = lienzo.getContext("2d")!;
  const imagen = contexto.getImageData(0, 0, lienzo.width, lienzo.height);
  const px = imagen.data;
  for (let i = 0; i < px.length; i += 4) {
    const luz = 0.299 * px[i] + 0.587 * px[i + 1] + 0.114 * px[i + 2];
    const v = luz > UMBRAL_BLANCO ? 255 : luz;
    px[i] = px[i + 1] = px[i + 2] = v;
    px[i + 3] = 255;
  }
  contexto.putImageData(imagen, 0, 0);
}
