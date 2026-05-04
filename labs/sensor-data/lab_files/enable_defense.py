"""
enable_defense.py - switch Lab 1 local target into protected mode.
"""

import requests


TARGET_URL = "http://127.0.0.1:5000/defense/enable"


def main():
    response = requests.post(TARGET_URL, timeout=5)
    response.raise_for_status()
    state = response.json()

    print("Defense mode enabled.")
    print(f"mode={state.get('mode')}")
    print(f"defense_enabled={state.get('defense_enabled')}")
    print()
    print("Now rerun the same attack:")
    print("python3 /home/lab/Desktop/Lab1/poison_data.py")


if __name__ == "__main__":
    main()
