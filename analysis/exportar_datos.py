"""Exporta mis movimientos de Supabase a un CSV para analizarlos con pandas.

Uso (desde la raíz del proyecto):

    python3 analysis/exportar_datos.py

Pide el correo y la contraseña de la app, inicia sesión igual que lo hace la
web y descarga los movimientos. Decisiones:

- No usa la llave secreta "service_role" de Supabase. Entra como usuario
  normal, así que la seguridad por fila (RLS) sigue aplicando y no hay que
  guardar ningún secreto en disco.
- Solo usa la biblioteca estándar de Python: no hay nada que instalar.
- El CSV queda en analysis/data/, carpeta ignorada por git: son datos reales.
"""

from __future__ import annotations

import csv
import getpass
import json
import sys
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path

RAIZ = Path(__file__).resolve().parent.parent
SALIDA = RAIZ / "analysis" / "data" / "movimientos.csv"
COLUMNAS = ["fecha", "tipo", "monto", "categoria", "descripcion", "metodo_pago", "origen"]
POR_PAGINA = 1000  # Supabase devuelve como máximo 1000 filas por petición


def leer_env() -> dict[str, str]:
    """Lee las variables de .env.local (el mismo archivo que usa la app web)."""
    ruta = RAIZ / ".env.local"
    if not ruta.exists():
        sys.exit("No encontré .env.local en la raíz del proyecto.")
    variables = {}
    for linea in ruta.read_text(encoding="utf-8").splitlines():
        linea = linea.strip()
        if linea and not linea.startswith("#") and "=" in linea:
            clave, valor = linea.split("=", 1)
            variables[clave.strip()] = valor.strip().strip("\"'")
    return variables


def pedir(url: str, llave: str, token: str | None = None, cuerpo: dict | None = None):
    """Hace una petición a la API de Supabase y devuelve el JSON de respuesta."""
    encabezados = {"apikey": llave, "Content-Type": "application/json"}
    if token:
        encabezados["Authorization"] = f"Bearer {token}"
    datos = json.dumps(cuerpo).encode() if cuerpo is not None else None
    peticion = urllib.request.Request(url, data=datos, headers=encabezados)
    with urllib.request.urlopen(peticion, timeout=30) as respuesta:
        return json.loads(respuesta.read().decode("utf-8"))


def iniciar_sesion(base: str, llave: str) -> str:
    """Devuelve un token de acceso temporal (caduca en una hora)."""
    correo = input("Correo de la app: ").strip()
    contrasena = getpass.getpass("Contraseña (no se muestra al escribir): ")
    try:
        sesion = pedir(
            f"{base}/auth/v1/token?grant_type=password",
            llave,
            cuerpo={"email": correo, "password": contrasena},
        )
    except urllib.error.HTTPError as error:
        if error.code in (400, 401):
            sys.exit("Correo o contraseña incorrectos.")
        raise
    return sesion["access_token"]


def descargar_movimientos(base: str, llave: str, token: str) -> list[dict]:
    """Descarga todos los movimientos, página por página."""
    filas: list[dict] = []
    while True:
        consulta = urllib.parse.urlencode(
            {
                # categorias(nombre) trae el nombre de la categoría relacionada
                "select": "fecha,tipo,monto,descripcion,metodo_pago,origen,categorias(nombre)",
                "order": "fecha.asc,created_at.asc",
                "limit": POR_PAGINA,
                "offset": len(filas),
            }
        )
        pagina = pedir(f"{base}/rest/v1/movimientos?{consulta}", llave, token)
        filas.extend(pagina)
        if len(pagina) < POR_PAGINA:
            return filas


def main() -> None:
    env = leer_env()
    base = env.get("NEXT_PUBLIC_SUPABASE_URL", "").rstrip("/")
    llave = env.get("NEXT_PUBLIC_SUPABASE_ANON_KEY", "")
    if not base or not llave:
        sys.exit("Faltan NEXT_PUBLIC_SUPABASE_URL o NEXT_PUBLIC_SUPABASE_ANON_KEY en .env.local.")

    token = iniciar_sesion(base, llave)
    movimientos = descargar_movimientos(base, llave, token)

    SALIDA.parent.mkdir(parents=True, exist_ok=True)
    with SALIDA.open("w", newline="", encoding="utf-8") as archivo:
        escritor = csv.DictWriter(archivo, fieldnames=COLUMNAS)
        escritor.writeheader()
        for m in movimientos:
            escritor.writerow(
                {
                    "fecha": m["fecha"],
                    "tipo": m["tipo"],
                    "monto": m["monto"],
                    "categoria": (m.get("categorias") or {}).get("nombre") or "Sin categoría",
                    "descripcion": m.get("descripcion") or "",
                    "metodo_pago": m.get("metodo_pago") or "",
                    "origen": m["origen"],
                }
            )

    print(f"Listo: {len(movimientos)} movimientos en {SALIDA.relative_to(RAIZ)}")


if __name__ == "__main__":
    try:
        main()
    except (KeyboardInterrupt, EOFError):
        sys.exit("\nCancelado.")
    except urllib.error.URLError as error:
        sys.exit(f"No pude conectar con Supabase: {error.reason}")
