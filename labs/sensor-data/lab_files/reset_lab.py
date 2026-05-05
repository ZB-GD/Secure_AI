"""
reset_lab.py - reset Lab 1 local target state and logs.
"""

import requests


TARGET_URL = "http://127.0.0.1:5000/reset"


def main():
    response = requests.post(TARGET_URL, timeout=5)
    response.raise_for_status()
    state = response.json()

    print("Lab 1 state reset.")
    print(f"mode={state.get('mode')}")
    print(f"attack_attempts={state.get('attack_attempts')}")
    print(f"accepted={state.get('accepted')}")
    print(f"rejected={state.get('rejected')}")


if __name__ == "__main__":
    main()
