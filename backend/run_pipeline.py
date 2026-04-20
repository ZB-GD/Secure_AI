"""
run_pipeline.py — Monorepo pipeline runner
Executes the 3-node traffic prediction pipeline locally.
Runs both CLEAN and VULNERABLE modes and prints a side-by-side comparison.

Node layout (matches architecture diagram):
  N1  Sensor Data       — raw ingestion + attack injection
  N2  Edge node         — preprocessing + feature extraction
  N3  Actuator node     — inference + decision making (merged)
  (N4 Trainer node      — stub, not run inline)

Usage:
    python run_pipeline.py               # clean + vulnerable, 10 readings
    python run_pipeline.py --mode clean  # clean only
    python run_pipeline.py --n 20        # 20 sensor readings
    python run_pipeline.py --json        # raw JSON output
"""

import json
import argparse

from nodes.sensor_data import app as sensor_node
from nodes.edge_preprocessing import app as preprocessing_node
from nodes.actuator import app as actuator_node


# ── ANSI colours ──────────────────────────────────────────────────────────────
RED    = "\033[91m"
GREEN  = "\033[92m"
YELLOW = "\033[93m"
CYAN   = "\033[96m"
BOLD   = "\033[1m"
RESET  = "\033[0m"

STATE_COLOURS = {
    "free":     GREEN,
    "moderate": YELLOW,
    "heavy":    RED,
    "gridlock": RED + BOLD,
}


def _coloured_state(state: str) -> str:
    return f"{STATE_COLOURS.get(state, '')}{state}{RESET}"


def _header(title: str, mode: str) -> None:
    colour = GREEN if mode == "clean" else RED
    bar = "═" * 60
    print(f"\n{colour}{BOLD}{bar}")
    print(f"  {title.upper()}  [{mode.upper()} MODE]")
    print(f"{bar}{RESET}")


def _section(title: str) -> None:
    print(f"\n{CYAN}{BOLD}── {title} ──{RESET}")


def _print_log(log: list[str], mode: str) -> None:
    for line in log:
        if "REJECT" in line or "INVALID" in line or "HALT" in line or "WARNING" in line:
            print(f"  {RED}{line}{RESET}")
        elif "POISONED" in line or "ANOMALOUS" in line or "BACKDOOR" in line:
            print(f"  {YELLOW}{line}{RESET}")
        elif "ACCEPT" in line or "OK" in line or "INTEGRITY" in line:
            print(f"  {GREEN}{line}{RESET}")
        else:
            print(f"  {line}")


# ── Pipeline runner ───────────────────────────────────────────────────────────

def run_pipeline(mode: str, n_readings: int) -> dict:
    """Run all nodes in sequence for a given mode. Return outputs dict."""
    _header("Smart City Traffic Pipeline", mode)

    # N1 — Sensor Data (Sensor and actuator Node in diagram)
    _section("N1 — Sensor Data")
    out1 = sensor_node.run(mode=mode, n_readings=n_readings)
    _print_log(out1["log"], mode)

    # N2 — Edge Node (preprocessing)
    _section("N2 — Edge Node (Preprocessing)")
    out2 = preprocessing_node.run(sensor_output=out1, mode=mode)
    _print_log(out2["log"], mode)

    # N3 — Actuator Node (inference + decision making)
    _section("N3 — Actuator Node (Inference + Decision Making)")
    out3 = actuator_node.run(preprocessing_output=out2, mode=mode)
    _print_log(out3["log"], mode)

    return {"n1": out1, "n2": out2, "n3": out3}


# ── Comparison printer ────────────────────────────────────────────────────────

def print_comparison(clean: dict, vuln: dict) -> None:
    bar = "─" * 60
    print(f"\n{BOLD}{bar}")
    print(f"  COMPARISON — CLEAN vs VULNERABLE")
    print(f"{bar}{RESET}")

    # N1 — Sensor Data
    c1, v1 = clean["n1"], vuln["n1"]
    print(f"\n{BOLD}N1 · Sensor Data{RESET}")
    print(f"  forwarded:  clean={len(c1['readings'])}  vulnerable={len(v1['readings'])}")
    print(f"  dropped:    clean={len(c1['dropped'])}   vulnerable={len(v1['dropped'])}")

    # N2 — Edge Node
    c2, v2 = clean["n2"], vuln["n2"]
    print(f"\n{BOLD}N2 · Edge Node (Preprocessing){RESET}")
    scores_clean = [f["congestion_score"] for f in c2["features"]]
    scores_vuln  = [f["congestion_score"] for f in v2["features"]]
    if scores_clean:
        avg_c = sum(scores_clean) / len(scores_clean)
        avg_v = sum(scores_vuln) / len(scores_vuln) if scores_vuln else float("nan")
        print(f"  avg congestion score: clean={avg_c:.3f}  vulnerable={avg_v:.3f}")
    out_of_range = [s for s in scores_vuln if not (0 <= s <= 1)]
    if out_of_range:
        print(f"  {RED}out-of-range features (vuln): {len(out_of_range)}{RESET}")

    # N3 — Actuator Node
    c3, v3 = clean["n3"], vuln["n3"]
    print(f"\n{BOLD}N3 · Actuator Node{RESET}")

    # Inference section
    print(f"  {CYAN}[Inference]{RESET}")
    ca, va = c3.get("aggregate", {}), v3.get("aggregate", {})
    cs = _coloured_state(ca.get("dominant_state", "N/A"))
    vs = _coloured_state(va.get("dominant_state", "N/A"))
    print(f"    dominant state: clean={cs}  vulnerable={vs}")
    print(f"    avg score:      clean={ca.get('avg_congestion_score', 'N/A')}  "
          f"vulnerable={va.get('avg_congestion_score', 'N/A')}")
    print(f"    model verified: clean={c3.get('integrity_ok')}  "
          f"vulnerable={v3.get('integrity_ok')}")

    # Decision section
    print(f"  {CYAN}[Decision Making]{RESET}")
    print(f"    actions taken:  clean={len(c3['actions'])}  vulnerable={len(v3['actions'])}")
    print(f"    halted:         clean={c3['halted']}  vulnerable={v3['halted']}")
    cr = c3["retraining_feedback"]
    vr = v3["retraining_feedback"]
    print(f"    est. drift:     clean={cr['estimated_drift']}  vulnerable={vr['estimated_drift']}")
    if vr.get("warning"):
        print(f"    {RED}⚠  {vr['warning']}{RESET}")

    print(f"\n{bar}")


# ── Entry point ───────────────────────────────────────────────────────────────

def main() -> None:
    parser = argparse.ArgumentParser(description="Run the smartcity traffic pipeline")
    parser.add_argument(
        "--mode", choices=["clean", "vulnerable", "both"],
        default="both", help="Pipeline mode (default: both)"
    )
    parser.add_argument(
        "--n", type=int, default=10,
        help="Number of sensor readings (default: 10)"
    )
    parser.add_argument(
        "--json", action="store_true",
        help="Output raw JSON instead of formatted text"
    )
    args = parser.parse_args()

    if args.mode == "both":
        clean_result = run_pipeline("clean",      args.n)
        vuln_result  = run_pipeline("vulnerable", args.n)
        if args.json:
            print(json.dumps({"clean": clean_result, "vulnerable": vuln_result}, indent=2))
        else:
            print_comparison(clean_result, vuln_result)
    else:
        result = run_pipeline(args.mode, args.n)
        if args.json:
            print(json.dumps(result, indent=2))


if __name__ == "__main__":
    main()