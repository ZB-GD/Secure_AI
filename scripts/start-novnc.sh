#!/usr/bin/env bash

NO_VNC_DIR="$HOME/tools/noVNC"

"$NO_VNC_DIR/utils/novnc_proxy" --vnc localhost:5901 --listen localhost:6081 >/tmp/novnc-l1.log 2>&1 &
"$NO_VNC_DIR/utils/novnc_proxy" --vnc localhost:5902 --listen localhost:6082 >/tmp/novnc-l2.log 2>&1 &
"$NO_VNC_DIR/utils/novnc_proxy" --vnc localhost:5903 --listen localhost:6083 >/tmp/novnc-l3.log 2>&1 &
"$NO_VNC_DIR/utils/novnc_proxy" --vnc localhost:5904 --listen localhost:6084 >/tmp/novnc-l4.log 2>&1 &

echo "noVNC lanzado en:"
echo "  L1 -> http://localhost:6081/vnc.html"
echo "  L2 -> http://localhost:6082/vnc.html"
echo "  L3 -> http://localhost:6083/vnc.html"
echo "  L4 -> http://localhost:6084/vnc.html"


wait