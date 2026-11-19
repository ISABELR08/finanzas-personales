"""Genera movimientos INVENTADOS de una estudiante en México.

Sirve para que el notebook, las capturas y el README se puedan mostrar en
público sin exponer datos reales. El resultado tiene exactamente las mismas
columnas que exportar_datos.py, así que el análisis funciona igual con ambos.

Uso (desde la raíz del proyecto):

    python3 analysis/generar_datos_ejemplo.py

La semilla es fija: siempre produce el mismo archivo (reproducible).
Los datos esconden a propósito los patrones que el análisis debe descubrir:
más gasto en fin de semana, gastos recurrentes, un pico en regreso a clases
y algunos gastos atípicos.
"""

from __future__ import annotations

import csv
import random
from datetime import date, timedelta
from pathlib import Path

SEMILLA = 42
INICIO = date(2026, 1, 1)
FIN = date(2026, 10, 31)
SALIDA = Path(__file__).resolve().parent / "data" / "ejemplo" / "movimientos_ejemplo.csv"
COLUMNAS = ["fecha", "tipo", "monto", "categoria", "descripcion", "metodo_pago", "origen"]

rng = random.Random(SEMILLA)
filas: list[dict] = []


def agregar(fecha, tipo, monto, categoria, descripcion, metodo, origen):
    filas.append(
        {
            "fecha": fecha.isoformat(),
            "tipo": tipo,
            "monto": f"{monto:.2f}",
            "categoria": categoria,
            "descripcion": descripcion,
            "metodo_pago": metodo,
            "origen": origen,
        }
    )


def precio(minimo: float, maximo: float, redondeo: float = 0.5) -> float:
    """Un precio al azar, redondeado como suelen verse los precios reales."""
    return round(rng.uniform(minimo, maximo) / redondeo) * redondeo


def dias(inicio: date, fin: date):
    d = inicio
    while d <= fin:
        yield d
        d += timedelta(days=1)


COMIDAS = [
    ("Tacos", 60, 120), ("Comida corrida", 75, 110), ("Café", 40, 75),
    ("Torta", 45, 70), ("Cafetería de la escuela", 55, 95), ("Pizza", 120, 220),
    ("Sushi", 160, 280), ("Hamburguesa", 110, 190), ("Antojitos", 35, 80),
]
SALIDAS = [("Cine", 150, 260), ("Bar con amigos", 220, 520), ("Boliche", 180, 300), ("Museo", 60, 120)]

for dia in dias(INICIO, FIN):
    dia_semana = dia.weekday()  # 0 = lunes ... 6 = domingo
    fin_de_semana = dia_semana >= 4  # viernes, sábado y domingo
    vacaciones = dia.month == 7 or (dia.month == 1 and dia.day < 12)

    # ── Ingresos ──────────────────────────────────────────────
    if dia.day == 1:
        agregar(dia, "ingreso", 5500, "Beca / Mesada", "Beca mensual", "transferencia", "banco")
    if dia.day == 15:
        agregar(dia, "ingreso", 3500, "Beca / Mesada", "Mesada", "transferencia", "banco")
    if dia_semana == 5 and rng.random() < 0.45:
        agregar(dia, "ingreso", precio(300, 600, 50), "Trabajo", "Clases particulares", "efectivo", "manual")

    # ── Gastos recurrentes (mismo día y monto cada mes) ───────
    if dia.day == 5:
        agregar(dia, "gasto", 2800, "Renta y servicios", "Renta del cuarto", "transferencia", "banco")
    if dia.day == 6:
        agregar(dia, "gasto", 129, "Suscripciones", "SPOTIFY MEXICO", "debito", "banco")
    if dia.day == 12:
        agregar(dia, "gasto", 219, "Suscripciones", "NETFLIX", "debito", "banco")
    if dia.day == 20:
        agregar(dia, "gasto", 200, "Renta y servicios", "Recarga TELCEL", "debito", "banco")
    if dia.day == 22 and dia.month % 2 == 0:
        agregar(dia, "gasto", precio(180, 320, 1), "Renta y servicios", "CFE luz (bimestral)", "debito", "banco")

    # ── Comida: casi diario, más y más cara en fin de semana ──
    probabilidad = 0.8 if fin_de_semana else 0.55
    veces = (1 if rng.random() < probabilidad else 0) + (1 if rng.random() < (0.35 if fin_de_semana else 0.1) else 0)
    for _ in range(veces):
        nombre, minimo, maximo = rng.choice(COMIDAS[5:] if fin_de_semana and rng.random() < 0.5 else COMIDAS[:5])
        efectivo = rng.random() < 0.55
        agregar(dia, "gasto", precio(minimo, maximo), "Comida", nombre,
                "efectivo" if efectivo else "debito", "manual" if efectivo else "banco")

    # ── Transporte: entre semana y en periodo de clases ───────
    if dia_semana < 5 and not vacaciones and rng.random() < 0.85:
        agregar(dia, "gasto", rng.choice([12, 12, 18, 24, 30]), "Transporte", "Metro / camión", "efectivo", "manual")
    if fin_de_semana and rng.random() < 0.25:
        agregar(dia, "gasto", precio(65, 170), "Transporte", "UBER TRIP", "debito", "banco")

    # ── Súper: una vez por semana, en domingo ─────────────────
    if dia_semana == 6 and rng.random() < 0.9:
        agregar(dia, "gasto", precio(260, 520, 0.1), "Súper", rng.choice(["WALMART", "SORIANA", "CHEDRAUI"]), "debito", "banco")

    # ── Entretenimiento: fines de semana ──────────────────────
    if fin_de_semana and rng.random() < 0.22:
        nombre, minimo, maximo = rng.choice(SALIDAS)
        agregar(dia, "gasto", precio(minimo, maximo, 5), "Entretenimiento", nombre, "debito", "banco")

    # ── Ocasionales ───────────────────────────────────────────
    if rng.random() < 0.03:
        agregar(dia, "gasto", precio(90, 380), "Salud", rng.choice(["Farmacia", "Consulta médica"]), "debito", "banco")
    if rng.random() < 0.025:
        agregar(dia, "gasto", precio(250, 800, 1), "Ropa y personal", rng.choice(["Ropa", "Corte de cabello", "Tenis"]), "debito", "banco")
    if not vacaciones and rng.random() < 0.07:
        agregar(dia, "gasto", precio(25, 160), "Escuela", rng.choice(["Copias e impresiones", "Papelería", "Material de laboratorio"]), "efectivo", "manual")

# ── Eventos puntuales: picos y gastos atípicos ────────────────
ESPECIALES = [
    (date(2026, 1, 19), "Escuela", "Inscripción semestre", 1850, "transferencia"),
    (date(2026, 2, 14), "Entretenimiento", "Cena de San Valentín", 780, "debito"),
    (date(2026, 3, 21), "Salud", "Dentista (urgencia)", 2400, "debito"),
    (date(2026, 5, 9), "Entretenimiento", "Boletos de concierto", 1950, "debito"),
    (date(2026, 6, 13), "Otros", "Reparación de laptop", 3200, "transferencia"),
    (date(2026, 8, 10), "Escuela", "Inscripción semestre", 1850, "transferencia"),
    (date(2026, 8, 12), "Escuela", "Libros del semestre", 1420, "debito"),
    (date(2026, 8, 15), "Escuela", "Calculadora científica", 690, "debito"),
    (date(2026, 9, 16), "Transporte", "Autobús a casa (puente)", 940, "debito"),
]
for fecha, categoria, descripcion, monto, metodo in ESPECIALES:
    agregar(fecha, "gasto", monto, categoria, descripcion, metodo, "banco")
agregar(date(2026, 6, 20), "ingreso", 3000, "Otros ingresos", "Regalo de cumpleaños", "transferencia", "banco")

# ── Imperfecciones, para que la limpieza del notebook tenga trabajo real ──
# 1) Algunas descripciones vacías.  2) Una categoría con espacios y mayúsculas
# inconsistentes.  3) Un renglón duplicado por error.
filas.sort(key=lambda f: f["fecha"])
for fila in rng.sample(filas, 12):
    fila["descripcion"] = ""
for fila in rng.sample([f for f in filas if f["categoria"] == "Comida"], 6):
    fila["categoria"] = rng.choice([" Comida", "comida", "COMIDA "])
filas.insert(200, dict(filas[199]))

SALIDA.parent.mkdir(parents=True, exist_ok=True)
with SALIDA.open("w", newline="", encoding="utf-8") as archivo:
    escritor = csv.DictWriter(archivo, fieldnames=COLUMNAS)
    escritor.writeheader()
    escritor.writerows(filas)

print(f"Listo: {len(filas)} movimientos inventados en {SALIDA.relative_to(Path.cwd()) if SALIDA.is_relative_to(Path.cwd()) else SALIDA}")
