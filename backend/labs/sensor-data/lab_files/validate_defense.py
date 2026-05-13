"""
validate_defense.py — CityFlow AI · Lab 1: Implementación de Defensas
======================================================================
Este script es tu entorno de trabajo para los pasos 3, 4 y 5 del laboratorio.

Instrucciones:
  1. Edita este archivo con gedit o el editor de texto de la VM
  2. Implementa las funciones marcadas con TODO
  3. Ejecuta el script para ver si tus defensas funcionan:
       python3 /home/lab/scripts/validate_defense.py

El script se conecta al pipeline real para obtener datos en vivo.
"""

import requests
import json
import numpy as np
import sys

# ── Configuración del backend ────────────────────────────────────────────────
BACKEND_CANDIDATES = [
    "http://backend:8000",
    "http://172.17.0.1:8000",
    "http://localhost:8000",
]

def find_backend():
    for url in BACKEND_CANDIDATES:
        try:
            r = requests.get(f"{url}/health", timeout=3)
            if r.status_code == 200:
                return url
        except Exception:
            continue
    return None

def call_pipeline(backend):
    resp = requests.get(f"{backend}/api/scenarios/1/run", timeout=15)
    resp.raise_for_status()
    result = resp.json()
    data = result.get("data", {})
    return (
        result.get("metrics", {}),
        data.get("n1", {}),
        data.get("n2", {}),
        data.get("n3", {}),
        data.get("n4", {}),
    )

# ════════════════════════════════════════════════════════════════════════════
#  PASO 3 — DEFENSA CAPA 1: SANITY CHECKS
#  Implementa esta función para rechazar lecturas físicamente imposibles.
# ════════════════════════════════════════════════════════════════════════════

def validate_reading(reading: dict) -> tuple:
    """
    Valida una lectura del sensor contra restricciones físicas.
    Devuelve (is_valid: bool, reason: str)

    Restricciones físicas del dataset Metro Interstate Traffic Volume:
      - traffic_volume >= ???   ← ¿cuál es el mínimo físico de coches en una carretera?
      - traffic_volume <= 10000 (máximo realista en esta autopista)
      - temp entre 200 y 350 (Kelvin absoluto — rango físico terrestre)
      - rain_1h >= 0 (no puede llover negativo)
      - clouds_all entre 0 y 100 (porcentaje)
    """
    traffic = reading.get("traffic_volume")
    temp    = reading.get("temp", 290)
    rain    = reading.get("rain_1h", 0)
    clouds  = reading.get("clouds_all", 0)

    # ── TODO: Implementa aquí tu validación ─────────────────────────────────
    #
    # Descomenta y completa las líneas siguientes:
    #
    # if traffic is None:
    #     return False, "traffic_volume ausente"
    #
    # if traffic < ???:    # ← la respuesta del Paso 3 de la guía
    #     return False, f"traffic_volume={traffic} por debajo del mínimo físico"
    #
    # if traffic > 10_000:
    #     return False, f"traffic_volume={traffic} supera el máximo realista"
    #
    # if not (200 <= temp <= 350):
    #     return False, f"Temperatura imposible: {temp}K"
    #
    # if rain < 0:
    #     return False, "Precipitación negativa imposible"
    #
    # if not (0 <= clouds <= 100):
    #     return False, f"clouds_all={clouds} fuera de rango 0-100%"
    #
    # ────────────────────────────────────────────────────────────────────────

    return True, "OK"   # ← elimina esta línea cuando implementes la lógica


# ════════════════════════════════════════════════════════════════════════════
#  PASO 4 — DEFENSA CAPA 2: DETECCIÓN DE ANOMALÍAS (Z-SCORE)
#  Implementa esta función para detectar valores estadísticamente anómalos.
# ════════════════════════════════════════════════════════════════════════════

# Baseline histórico — se calcula automáticamente más abajo con datos reales
MEAN_SCORE = 0.45   # se sobreescribe con datos del pipeline
STD_SCORE  = 0.20   # se sobreescribe con datos del pipeline
UMBRAL_Z   = 3.0    # ← cambia este valor para ver el efecto

def detectar_anomalia(feature: dict) -> tuple:
    """
    Detecta anomalías estadísticas usando Z-Score sobre congestion_score.
    Devuelve (es_anomalia: bool, z_score: float, accion: str)

    Fórmula Z-Score:  z = |( x - mean ) / std|
    Si z > UMBRAL_Z  →  QUARANTINE (no reenviar a NODE-3)
    """
    score = float(feature.get("congestion_score", 0))

    # ── TODO: Implementa el Z-Score ──────────────────────────────────────────
    #
    # z = abs((score - MEAN_SCORE) / STD_SCORE)
    #
    # if z > UMBRAL_Z:
    #     return True, round(z, 2), "QUARANTINE — valor anómalo"
    # return False, round(z, 2), "FORWARD — dentro del rango normal"
    #
    # ────────────────────────────────────────────────────────────────────────

    return False, 0.0, "FORWARD (sin implementar)"   # ← elimina cuando implementes


# ════════════════════════════════════════════════════════════════════════════
#  PASO 5 — DEFENSA CAPA 3: MONITORIZACIÓN DE DRIFT
#  Observa el drift_score real del pipeline y decide cuándo pausar.
# ════════════════════════════════════════════════════════════════════════════

DRIFT_UMBRAL = 0.25   # mismo que RETRAIN_DRIFT_THRESHOLD en pipeline_service.py

def evaluar_drift(drift_score: float) -> str:
    """
    Decide qué acción tomar según el drift_score del pipeline real.
    Devuelve una cadena con la acción recomendada.

    El backend ya calcula el drift_score — solo necesitas interpretarlo.
    """

    # ── TODO: Implementa la lógica de decisión ───────────────────────────────
    #
    # if drift_score >= DRIFT_UMBRAL:
    #     return "HALT RETRAINING — drift demasiado alto, mantener modelo baseline"
    # return "SAFE — nuevo modelo aprobado para despliegue"
    #
    # ────────────────────────────────────────────────────────────────────────

    return "Sin implementar"   # ← elimina cuando implementes


# ════════════════════════════════════════════════════════════════════════════
#  EJECUCIÓN — no modifiques este bloque
# ════════════════════════════════════════════════════════════════════════════

def main():
    print()
    print("=" * 62)
    print("  CityFlow AI — Lab 1: Validación de Defensas")
    print("=" * 62)

    backend = find_backend()
    use_live = backend is not None

    if use_live:
        print(f"  ✓ Pipeline real conectado: {backend}")
    else:
        print("  ⚠ Backend no disponible — usando datos simulados")
    print()

    # ── PASO 3: Sanity Checks ────────────────────────────────────────────────
    print("─" * 62)
    print("  PASO 3 · Sanity Checks (NODE-1)")
    print("─" * 62)

    # Casos de prueba fijos — siempre disponibles
    test_cases = [
        {"traffic_volume": 4200,  "temp": 288.0, "rain_1h": 0, "clouds_all": 40},
        {"traffic_volume": 0,     "temp": 273.0, "rain_1h": 0, "clouds_all": 0},
        {"traffic_volume": -5000, "temp": 0.0,   "rain_1h": 0, "clouds_all": 0},  # EL ATAQUE
        {"traffic_volume": 99999, "temp": 295.0, "rain_1h": 0, "clouds_all": 20},
    ]

    expected = [True, True, False, False]
    paso3_ok = True

    for i, (reading, exp) in enumerate(zip(test_cases, expected)):
        valid, reason = validate_reading(reading)
        status = "✓ ACEPTADO" if valid else "✗ RECHAZADO"
        ok = "✅" if valid == exp else "❌ INCORRECTO"
        if valid != exp:
            paso3_ok = False
        print(f"  {ok}  [{i+1}] vol={reading['traffic_volume']:>7}  → {status}  ({reason})")

    if paso3_ok:
        print()
        print("  ✅ Paso 3 completado — sanity checks funcionan correctamente")
    else:
        print()
        print("  ❌ Revisa tu implementación de validate_reading()")
        print("     El ataque [-5000] debe ser RECHAZADO.")
    print()

    # ── PASO 4: Anomaly Detection ────────────────────────────────────────────
    print("─" * 62)
    print("  PASO 4 · Z-Score Anomaly Detection (NODE-2)")
    print("─" * 62)

    global MEAN_SCORE, STD_SCORE

    if use_live:
        # Construir baseline con datos reales del pipeline
        print("  Recolectando baseline del pipeline real (3 llamadas)...")
        scores_hist = []
        for _ in range(3):
            try:
                m, _, n2, _, _ = call_pipeline(backend)
                feats = n2.get("features", [])
                valid_scores = [
                    float(f["congestion_score"]) for f in feats
                    if isinstance(f, dict)
                    and isinstance(f.get("congestion_score"), (int, float))
                    and 0.0 <= float(f["congestion_score"]) <= 1.0
                ]
                scores_hist.extend(valid_scores)
            except Exception:
                pass
        if scores_hist:
            MEAN_SCORE = float(np.mean(scores_hist))
            STD_SCORE  = float(np.std(scores_hist)) or 0.01
    else:
        MEAN_SCORE, STD_SCORE = 0.45, 0.18

    print(f"  Baseline: mean={MEAN_SCORE:.4f}, std={STD_SCORE:.4f}, umbral Z={UMBRAL_Z}")
    print()

    # Features de prueba
    test_features = [
        {"congestion_score": MEAN_SCORE + 0.05, "traffic_volume": 3500},
        {"congestion_score": -0.625,            "traffic_volume": -5000},  # envenenado
        {"congestion_score": MEAN_SCORE - 0.02, "traffic_volume": 1200},
        {"congestion_score": MEAN_SCORE + UMBRAL_Z * STD_SCORE + 0.1, "traffic_volume": 8500},
    ]
    expected4 = [False, True, False, True]
    paso4_ok  = True

    for i, (feat, exp) in enumerate(zip(test_features, expected4)):
        es_anom, z, accion = detectar_anomalia(feat)
        flag = "🔴" if es_anom else "🟢"
        ok   = "✅" if es_anom == exp else "❌"
        if es_anom != exp:
            paso4_ok = False
        print(f"  {ok} {flag}  score={feat['congestion_score']:>7.3f}  "
              f"Z={z:5.2f}  → {accion}")

    if paso4_ok:
        print()
        print("  ✅ Paso 4 completado — detección de anomalías funciona")
    else:
        print()
        print("  ❌ Revisa tu implementación de detectar_anomalia()")
        print("     El score negativo [-0.625] debe ser QUARANTINE.")
    print()

    # ── PASO 5: Drift Monitoring ─────────────────────────────────────────────
    print("─" * 62)
    print("  PASO 5 · Drift Monitoring (NODE-4)")
    print("─" * 62)

    if use_live:
        try:
            metrics, _, _, _, _ = call_pipeline(backend)
            drift_real = float(metrics.get("drift_score", 0) or 0)
        except Exception:
            drift_real = 0.0
    else:
        drift_real = 0.28  # valor simulado que supera el umbral

    print(f"  Drift score real del pipeline: {drift_real:.4f}")
    print(f"  Umbral de seguridad:           {DRIFT_UMBRAL:.2f}")
    print()

    accion = evaluar_drift(drift_real)
    esperada_halt = drift_real >= DRIFT_UMBRAL

    if accion == "Sin implementar":
        print("  ❌ evaluar_drift() no está implementada todavía.")
        print(f"     Con drift={drift_real:.3f} y umbral={DRIFT_UMBRAL}, la acción correcta es:")
        print(f"     {'HALT RETRAINING' if esperada_halt else 'SAFE — desplegar'}")
    else:
        es_halt = "halt" in accion.lower() or "pause" in accion.lower() or "stop" in accion.lower()
        if es_halt == esperada_halt:
            print(f"  ✅ Paso 5 completado")
        else:
            print(f"  ❌ Acción incorrecta para este drift_score")
        print(f"  → Acción decidida: {accion}")

    print()
    print("=" * 62)
    if paso3_ok and paso4_ok:
        print("  🎉 Defensas implementadas correctamente.")
        print("  Ahora ve a la pestaña QUIZ en el panel lateral para la evaluación final.")
    else:
        print("  Sigue editando el archivo y vuelve a ejecutar:")
        print("  python3 /home/lab/scripts/validate_defense.py")
    print("=" * 62)
    print()

if __name__ == "__main__":
    main()
