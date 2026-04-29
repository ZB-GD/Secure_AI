"""
poison_data.py — CityFlow AI · Lab 1: Data Poisoning Attack
=============================================================
Simula un ataque real de envenenamiento de datos contra el pipeline CityFlow.

Inyecta una lectura falsa donde traffic_volume = -5000 (físicamente imposible).
NODE-1 no tiene autenticación ni validación → acepta el payload sin cuestionar.

Ejecución:
    python3 /home/lab/scripts/poison_data.py

Observa los logs del pipeline en el frontend después de ejecutar este script.
"""

import requests
import json
import sys

# ── Configuración ────────────────────────────────────────────────────────────
# El backend real corre en el host Docker. Desde dentro de la VM,
# usamos host.docker.internal o la IP del gateway de Docker (172.17.0.1)
BACKEND_CANDIDATES = [
    "http://backend:8000",          # nombre de servicio Docker (red interna)
    "http://172.17.0.1:8000",       # gateway Docker desde dentro del contenedor
    "http://localhost:8000",        # fallback local
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

# ── Ejecutar el ataque ───────────────────────────────────────────────────────
def run_attack():
    print()
    print("=" * 62)
    print("  CityFlow AI — MQTT_INJECTOR.PY")
    print("  Lab 1: Data Poisoning Attack Simulation")
    print("=" * 62)
    print()

    backend = find_backend()

    if not backend:
        # Modo demo offline — simula la respuesta sin backend
        print("[!] Backend no accesible — ejecutando simulación local")
        print()
        print("[*] Conectando al endpoint de ingesta de NODE-1...")
        print("[*] Sin autenticación requerida — conexión aceptada")
        print()
        print("[*] Enviando payload envenenado:")
        print("    traffic_volume = -5000   ← IMPOSIBLE FÍSICAMENTE")
        print("    temp           = 0.0 K   ← Cero absoluto")
        print("    date_time      = 2016-12-08 08:00:00 (hora punta)")
        print()
        print("[+] PAYLOAD ACEPTADO — NODE-1 no tiene validación de entrada")
        print()
        print("    Propagación por el pipeline:")
        print("    NODE-1 (Sensor):      Forwarded 1 reading, Dropped 0")
        print("    NODE-2 (Preprocess):  congestion_score = -0.625  ← ANÓMALO")
        print("    NODE-3 (Inference):   state = 'free'  ← INCORRECTO (hora punta)")
        print("    NODE-4 (Decision):    SET_ALL_GREEN   ← PELIGROSO")
        print()
        print("[!] ATAQUE EXITOSO (simulado)")
        print("    El modelo ahora cree que las calles están vacías durante la hora punta.")
        return

    print(f"[*] Backend encontrado en: {backend}")
    print("[*] Llamando al pipeline en modo VULNERABLE...")
    print()

    try:
        resp = requests.get(f"{backend}/api/scenarios/1/run", timeout=15)
        resp.raise_for_status()
        result = resp.json()

        metrics = result.get("metrics", {})
        data    = result.get("data", {})
        n1      = data.get("n1", {})
        n2      = data.get("n2", {})
        n3      = data.get("n3", {})

        print("[+] RESPUESTA DEL PIPELINE:")
        print()
        print(f"  NODE-1 (Sensor Data):")
        print(f"    Lecturas aceptadas:   {metrics.get('readings_received', '?')}")
        print(f"    Lecturas envenenadas: {metrics.get('poisoned_readings', '?')}")
        for line in n1.get("log", [])[:4]:
            marker = "  🔴" if "-5000" in line else "    "
            print(f"  {marker} {line}")

        print()
        print(f"  NODE-2 (Edge Preprocessing):")
        print(f"    Features anómalas: {metrics.get('anomalous_features', '?')}")
        for line in n2.get("log", [])[:3]:
            marker = "  🔴" if any(x in line for x in ["-0.", "ANOMAL"]) else "    "
            print(f"  {marker} {line}")

        print()
        print(f"  NODE-3 (Traffic Inference):")
        print(f"    Estado dominante: {metrics.get('dominant_state', '?')}")
        print(f"    Integridad OK:    {metrics.get('integrity_ok', '?')}")

        print()
        print(f"  NODE-4 (Decision & Retraining):")
        print(f"    Drift score:         {metrics.get('drift_score', '?'):.3f}")
        print(f"    Retraining activado: {metrics.get('trainer_retrain_triggered', '?')}")

        print()
        print("[!] ATAQUE EJECUTADO")
        print("    Revisa los logs y métricas en el panel del frontend.")
        print("    El pipeline ha procesado el dato envenenado sin rechazarlo.")

    except Exception as e:
        print(f"[!] Error al llamar al pipeline: {e}")
        print("    Asegúrate de que el backend está corriendo (docker-compose up).")

    print()
    print("=" * 62)
    print("  Siguiente paso: Implementa las defensas en el notebook.")
    print("  Abre Firefox → http://localhost:8888 → notebook.ipynb")
    print("=" * 62)
    print()

if __name__ == "__main__":
    run_attack()
