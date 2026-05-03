"""
validate_defense.py — CityFlow AI · Lab 1: Implementación de Defensas
======================================================================
Este script es tu entorno de trabajo para los pasos 3, 4 y 5 del laboratorio.

Instrucciones:
  1. Edita este archivo con gedit o el editor de texto de la VM
  2. Implementa las funciones marcadas con TODO
  3. Ejecuta el script para ver si tus defensas funcionan:
       python3 /home/lab/Desktop/Lab1/validate_defense.py

El script usa datos locales de laboratorio. No llama al pipeline real.
"""

import numpy as np

BASELINE_SCORES = [0.42, 0.48, 0.39, 0.51, 0.46, 0.44, 0.49, 0.41]
LAB_DRIFT_SCORE = 0.28

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

# Baseline histórico local del laboratorio
MEAN_SCORE = 0.45
STD_SCORE  = 0.20
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
#  Observa el drift_score del laboratorio y decide cuándo pausar.
# ════════════════════════════════════════════════════════════════════════════

DRIFT_UMBRAL = 0.25   # mismo que RETRAIN_DRIFT_THRESHOLD en pipeline_service.py

def evaluar_drift(drift_score: float) -> str:
    """
    Decide qué acción tomar según el drift_score observado.
    Devuelve una cadena con la acción recomendada.

    El laboratorio ya proporciona el drift_score — solo necesitas interpretarlo.
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
    print("  ✓ Modo aislado: usando datos locales del contenedor Lab 1")
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

    MEAN_SCORE = float(np.mean(BASELINE_SCORES))
    STD_SCORE = float(np.std(BASELINE_SCORES)) or 0.01

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

    drift_real = LAB_DRIFT_SCORE

    print(f"  Drift score del laboratorio:   {drift_real:.4f}")
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
        print("  python3 /home/lab/Desktop/Lab1/validate_defense.py")
    print("=" * 62)
    print()

if __name__ == "__main__":
    main()
