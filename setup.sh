#!/bin/bash
# setup.sh — SecLabs
#
# Ejecutar DENTRO de la VM, una vez instalado Ubuntu Server 22.04.
# Instala Docker, Python 3, Node.js y configura la red host-only permanente.
#
# Uso:
#   git clone https://github.com/ZB-GD/SecLabs.git
#   cd SecLabs
#   chmod +x setup.sh
#   ./setup.sh

set -e

echo "======================================================"
echo "  SecLabs — setup del entorno de desarrollo"
echo "======================================================"


# ── Docker ─────────────────────────────────────────────────────────────────────
echo ""
echo "[1/4] Comprobando Docker..."

if command -v docker &> /dev/null; then
    echo "Docker ya está instalado ($(docker --version))"
else
    echo "Instalando Docker..."
    curl -fsSL https://get.docker.com | sh
    sudo usermod -aG docker $USER
    echo ""
    echo "IMPORTANTE: Docker instalado pero necesitas cerrar sesión SSH"
    echo "y volver a entrar para que el grupo 'docker' tenga efecto."
    echo "Luego vuelve a ejecutar: ./setup.sh"
    exit 0
fi


# ── Python ─────────────────────────────────────────────────────────────────────
echo ""
echo "[2/4] Comprobando Python 3..."

if command -v python3 &> /dev/null; then
    echo "Python ya está instalado ($(python3 --version))"
else
    sudo apt update -q
    sudo apt install -y python3 python3-pip python3-venv
    python3 --version
fi


# ── Node.js ────────────────────────────────────────────────────────────────────
echo ""
echo "[3/4] Comprobando Node.js..."

if command -v node &> /dev/null; then
    echo "Node.js ya está instalado ($(node --version))"
else
    curl -fsSL https://deb.nodesource.com/setup_lts.x | sudo -E bash -
    sudo apt install -y nodejs
    node --version && npm --version
fi


# ── Netplan: host-only permanente (DHCP) ───────────────────────────────────────
echo ""
echo "[4/4] Configurando interfaz host-only permanente..."

if ip link show enp0s8 &> /dev/null; then
    sudo tee /etc/netplan/99-host-only.yaml > /dev/null <<'EOF'
network:
  version: 2
  ethernets:
    enp0s8:
      dhcp4: true
EOF
    sudo chmod 600 /etc/netplan/99-host-only.yaml
    sudo netplan apply 2>/dev/null || true
    echo "enp0s8 configurada (DHCP). IP asignada:"
    ip addr show enp0s8 | grep "inet " || echo "  (se asignará en el próximo arranque)"
    echo ""
    echo "Apunta la IP que aparece arriba — la necesitarás para conectarte por SSH."
    echo "Si quieres fijarla como estática, consulta TROUBLESHOOTING.md."
else
    echo "enp0s8 no encontrada — omitiendo."
    echo "Consulta TROUBLESHOOTING.md si necesitas SSH desde el host."
fi


# ── Dependencias del backend ────────────────────────────────────────────────────
echo ""
if [ -f backend/requirements.txt ]; then
    echo "Instalando dependencias Python del backend..."
    python3 -m venv backend/.venv
    source backend/.venv/bin/activate
    pip install -r backend/requirements.txt
    echo "Entorno virtual creado en backend/.venv"
    echo "Para activarlo: source backend/.venv/bin/activate"
else
    echo "(backend/requirements.txt aún no existe, se instalará más adelante)"
fi


echo ""
echo "======================================================"
echo "  Setup completado"
echo "======================================================"
echo ""
echo "Verifica:"
echo "  docker run hello-world"
echo "  python3 --version"
echo "  node --version"
echo ""
echo "Si algo falló, consulta TROUBLESHOOTING.md"
