╔══════════════════════════════════════════════════════════════╗
║         CityFlow AI — Lab 1: Data Poisoning & Defense        ║
║                    GUÍA DE LA MÁQUINA VIRTUAL                ║
╚══════════════════════════════════════════════════════════════╝

ESTRUCTURA DEL LAB
──────────────────
  /home/lab/
  ├── README-LAB1.txt          ← este archivo
  ├── scripts/
  │   ├── poison_data.py       ← Paso 2: script de ataque
  │   └── validate_defense.py  ← Pasos 3-4-5: implementa tus defensas aquí
  └── output/                  ← aquí se guardan los resultados

CÓMO TRABAJAR
─────────────
Sigue la guía del panel lateral (pestaña GUIDE).
Cada paso del panel corresponde a un comando aquí en la VM.

  PASO 1 — Deconstruye el exploit
    Abre el terminal y explora los archivos:
      cat /home/lab/scripts/poison_data.py

  PASO 2 — Ejecuta el ataque
    En el terminal:
      python3 /home/lab/scripts/poison_data.py
    Luego mira los logs en el panel → pestaña LOGS

  PASO 3, 4 y 5 — Implementa las defensas
    Abre el editor de texto:
      gedit /home/lab/scripts/validate_defense.py
    Completa las funciones marcadas con TODO.
    Ejecuta para verificar:
      python3 /home/lab/scripts/validate_defense.py

ATAJOS DE TECLADO
─────────────────
  Ctrl+Alt+T  →  Abrir terminal
  Doble clic en "File System"  →  Explorar archivos

BACKEND DEL PIPELINE
────────────────────
  Los scripts se conectan al pipeline real automáticamente.
  Si ves "Backend no disponible", el pipeline no está corriendo.
  Desde el host: sudo docker-compose up --build

════════════════════════════════════════════════════════════════
  Cuando completes todos los pasos → pestaña QUIZ en el panel
════════════════════════════════════════════════════════════════
