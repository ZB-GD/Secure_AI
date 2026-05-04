==============================================================
        CityFlow AI - Lab 1: Data Poisoning & Defense
                         VM GUIDE
==============================================================

LAB STRUCTURE
-------------
  /home/lab/
  |-- README-LAB1.txt          <- this file
  |-- Desktop/Lab1/            <- visible files on the desktop
  |   |-- vulnerable_app.py    <- local target at 127.0.0.1:5000
  |   |-- poison_data.py       <- step 2 attack script
  |   |-- validate_defense.py  <- steps 3-5 defense implementation
  |   |-- enable_defense.py    <- switches the target to protected mode
  |   `-- reset_lab.py         <- resets lab state and logs
  |-- scripts/                 <- compatibility links to Desktop/Lab1
  `-- output/                  <- lab logs and state

HOW TO WORK
-----------
Follow the right-side GUIDE tab in the web interface.
Each guide step maps to commands in this VM.

  STEP 1 - Inspect the local target
    Open a terminal and confirm that the target is alive:
      curl http://127.0.0.1:5000/health

    Then inspect the files:
      cat /home/lab/Desktop/Lab1/vulnerable_app.py
      cat /home/lab/Desktop/Lab1/poison_data.py

  STEP 2 - Run the attack
    In the terminal:
      python3 /home/lab/Desktop/Lab1/poison_data.py

    Then check the panel:
      LOGS    -> attack chain and congestion_score
      METRICS -> local attack impact

  STEPS 3, 4, AND 5 - Implement the defenses
    Open the defense script:
      gedit /home/lab/Desktop/Lab1/validate_defense.py

    Complete the TODO functions.
    Run the validation script:
      python3 /home/lab/Desktop/Lab1/validate_defense.py

  STEP 6 - Enable defenses and rerun the attack
    Switch the local target to protected mode:
      python3 /home/lab/Desktop/Lab1/enable_defense.py

    Rerun the exact same attack:
      python3 /home/lab/Desktop/Lab1/poison_data.py

    Expected result:
      LOGS    -> NODE-1 REJECTED traffic_volume=-5000
      METRICS -> accepted/rejected changes from 1/0 to 1/1

  RESET THE LAB
      python3 /home/lab/Desktop/Lab1/reset_lab.py

KEYBOARD SHORTCUTS
------------------
  Ctrl+Alt+T  -> open terminal
  Double-click "File System" -> browse files

ISOLATION
---------
  Lab 1 runs entirely inside this VM/container.
  The local target listens at:
      http://127.0.0.1:5000

  It does not call the real backend pipeline.
  Lab events are written to:
      /home/lab/output/lab1-attack.log

PANEL METRICS
-------------
  ATTACK ATTEMPTS
    How many malicious submissions reached the local target.

  ACCEPTED / REJECTED
    Before defense, the target should accept. After defense, it should reject.

  CONGESTION SCORE
    Feature derived from traffic_volume. With -5000, it becomes negative.

  DEFENSE COVERAGE
    How many defense layers are active: sanity checks, anomaly detection,
    and drift monitoring.

  DOWNSTREAM RISK
    Risk that poisoned input reaches feature engineering, inference,
    or retraining.

==============================================================
  After completing all steps, open the QUIZ tab in the panel.
==============================================================
