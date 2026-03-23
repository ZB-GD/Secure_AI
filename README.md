# Secure AI Pipeline — TFG

Plataforma educativa para aprender seguridad en pipelines de IA. Permite al usuario ejecutar un pipeline de IA completo, explorar vulnerabilidades en un entorno aislado, y restaurar el pipeline limpio al finalizar.

---

## 📁 Estructura del proyecto

```
Secure_AI/
├── backend/
│   ├── api/                        # API REST que gestiona los contenedores dinámicamente
│   ├── labs/
│   │   ├── phase-1-ingestion/      # Contenedor aislado — Fase 1
│   │   ├── phase-2-input/          # Contenedor aislado — Fase 2
│   │   ├── phase-3-model/          # Contenedor aislado — Fase 3
│   │   └── phase-4-output/         # Contenedor aislado — Fase 4
│   ├── pipelines/
│   │   ├── docker-compose.e1.yml   # E1: pipeline general funcional
│   │   ├── docker-compose.e3-p1.yml
│   │   ├── docker-compose.e3-p2.yml
│   │   ├── docker-compose.e3-p3.yml
│   │   └── docker-compose.e3-p4.yml # E3: limpieza post-lab por fase
│   └── requirements.txt
├── frontend/                        # Interfaz de usuario (React)
├── docker-compose.yml               # Compose raíz
├── setup.sh                         # Setup del entorno de desarrollo (ejecutar dentro de la VM)
└── TROUBLESHOOTING.md               # Problemas conocidos y soluciones
```

### Los tres estados del sistema

| Estado | Descripción                                                                                            |
| ------ | ------------------------------------------------------------------------------------------------------ |
| **E1** | Pipeline general funcional — el usuario puede ver el pipeline completo corriendo                       |
| **E2** | Lab interactivo — cada fase corre en un contenedor aislado, gestionado dinámicamente desde el frontend |
| **E3** | Limpieza post-lab — se destruyen los contenedores del E2 y se restaura el entorno limpio               |

---

## 🖥️ Setup del entorno de desarrollo

El backend corre dentro de una VM (VirtualBox + Ubuntu Server). El frontend llama al backend por API REST desde fuera de la VM.

### 1. Instalar VirtualBox 7.0

> Si ya tienes VirtualBox 7.0 instalado, salta al paso 2.
> Si tienes VirtualBox 6.1, debes actualizarlo — consulta [TROUBLESHOOTING.md](TROUBLESHOOTING.md).

Descarga e instala VirtualBox 7.0 desde la [página oficial](https://www.virtualbox.org/wiki/Downloads).

En **Linux (Ubuntu/Debian)**, instala desde el repositorio oficial de Oracle:

```bash
sudo apt remove --purge virtualbox* -y
wget -O- https://www.virtualbox.org/download/oracle_vbox_2016.asc | \
  sudo gpg --dearmor --yes --output /usr/share/keyrings/oracle-virtualbox-2016.gpg
echo "deb [arch=amd64 signed-by=/usr/share/keyrings/oracle-virtualbox-2016.gpg] \
  https://download.virtualbox.org/virtualbox/debian jammy contrib" | \
  sudo tee /etc/apt/sources.list.d/virtualbox.list
sudo apt update && sudo apt install virtualbox-7.0 -y
sudo usermod -aG vboxusers $USER
```

### 2. Crear la VM

Descarga la ISO de Ubuntu Server 22.04:

```bash
wget https://releases.ubuntu.com/22.04.5/ubuntu-22.04.5-live-server-amd64.iso -P ~/Downloads/
```

Crea y configura la VM:

```bash
VBoxManage createvm --name "SecureAI-Lab" --ostype Ubuntu_64 --register
VBoxManage modifyvm "SecureAI-Lab" --memory 2048 --cpus 2
VBoxManage createhd --filename ~/VirtualBox\ VMs/SecureAI-Lab/SecureAI-Lab.vdi --size 20480
VBoxManage storagectl "SecureAI-Lab" --name "SATA" --add sata --controller IntelAhci
VBoxManage storageattach "SecureAI-Lab" --storagectl "SATA" --port 0 --device 0 --type hdd \
  --medium ~/VirtualBox\ VMs/SecureAI-Lab/SecureAI-Lab.vdi
VBoxManage storagectl "SecureAI-Lab" --name "IDE" --add ide
VBoxManage storageattach "SecureAI-Lab" --storagectl "IDE" --port 0 --device 0 --type dvddrive \
  --medium ~/Downloads/ubuntu-22.04.5-live-server-amd64.iso
VBoxManage modifyvm "SecureAI-Lab" --boot1 dvd --boot2 disk --boot3 none --boot4 none
VBoxManage modifyvm "SecureAI-Lab" --nic1 nat
VBoxManage modifyvm "SecureAI-Lab" --natpf1 "ssh,tcp,,2222,,22"
VBoxManage modifyvm "SecureAI-Lab" --nic2 hostonly --hostonlyadapter2 vboxnet0
```

### 3. Instalar Ubuntu Server

Arranca la VM:

```bash
VBoxManage startvm "SecureAI-Lab" --type headless
```

Conéctate para ver la pantalla de instalación:

```bash
# Opción A — SSH (cuando el instalador lo permita)
ssh -p 2222 <tu_usuario>@localhost

# Opción B — RDP con Remmina (requiere Extension Pack instalado)
# Nueva conexión → RDP → localhost:3389
```

Sigue el instalador de Ubuntu Server. Cuando te pregunte:

- **Installer update**: selecciona _Continue without updating_
- **SSH**: activa _Install OpenSSH server_
- **Snaps adicionales**: no selecciones ninguno (Docker se instala con el setup.sh)

Una vez instalado, la VM reiniciará. Conéctate por SSH:

```bash
ssh <tu_usuario>@<IP_de_enp0s8>
# Para ver la IP: ip addr show enp0s8
```

> Si SSH no funciona por NAT (puerto 2222), consulta [TROUBLESHOOTING.md](TROUBLESHOOTING.md).

### 4. Clonar el repo y ejecutar el setup

Dentro de la VM:

```bash
git clone https://github.com/ZB-GD/Secure_AI.git
cd Secure_AI
chmod +x setup.sh
./setup.sh
```

El script instala Docker, Python 3, Node.js y configura la red host-only permanente. Al final te indica la IP de la VM para conectarte por SSH.

> Si `docker pull` falla con error de certificado TLS, consulta [TROUBLESHOOTING.md](TROUBLESHOOTING.md) (problema conocido con FortiClient VPN).

### 5. Uso diario

```bash
# Arrancar la VM (desde el host)
VBoxManage startvm "SecureAI-Lab" --type headless

# Conectar por SSH
ssh <tu_usuario>@<IP_de_enp0s8>

# Apagar la VM
VBoxManage controlvm "SecureAI-Lab" poweroff
```

---

## 🌿 Flujo de trabajo con Git

### Ramas

```
main
└── dev                           ← integración estable
    ├── feature/backend-glaira    ← backend e infraestructura
    └── feature/frontend-[nombre] ← interfaz de usuario
```

- **`main`**: producción, solo recibe merges desde `dev` cuando todo está estable.
- **`dev`**: rama de integración. Aquí se juntan los cambios de ambas partes.
- **`feature/`**: cada una trabaja en su propia rama y hace PR hacia `dev`.

---

### Setup inicial (solo la primera vez)

```bash
git clone <url-del-repo>
cd Secure_AI

# Posicionarse en dev y crear tu rama
git checkout dev
git pull origin dev
git checkout -b feature/frontend-[tunombre]
git push -u origin feature/frontend-[tunombre]
```

---

### Flujo de trabajo diario

```bash
# 1. Asegúrate de estar en tu rama
git checkout feature/frontend-[tunombre]

# 2. Sincroniza con dev antes de empezar (importante!)
git pull origin dev

# 3. Trabaja... haz cambios...

# 4. Añade y commitea
git add .
git commit -m "feat: descripción de lo que hiciste"

# 5. Sube tu rama
git push
```

---

### Hacer una Pull Request a dev

Una Pull Request (PR) es la forma de integrar el trabajo de tu rama en `dev`. Básicamente le dices a Git: _"tengo cambios en mi rama que quiero unir a dev, ¿los revisamos antes?"_

```
feature/backend-glaira    ──── PR ────►  dev  ──── PR ────►  main
feature/frontend-[nombre] ──── PR ────►  dev
```

**¿Por qué no pushear directamente a `dev`?**

- Evita que una rompa el trabajo de la otra sin querer
- Permite revisar los cambios antes de que entren
- Si hay conflictos (las dos tocaron el mismo archivo), se resuelven en la PR antes de mergear

**Cómo hacerla:**

1. Ve a GitHub → **Pull Requests** → **New pull request**
2. Base: `dev` ← Compare: `feature/tu-rama`
3. Escribe una descripción breve de los cambios
4. Avisa a la otra para que revise antes de mergear

> Como somos dos, podemos mergear nuestra propia PR sin esperar revisión, **excepto** cuando las dos hayamos tocado archivos compartidos (como `docker-compose.yml` raíz). En ese caso, revisamos juntas antes de mergear.

---

### Convención de commits

Usamos [Conventional Commits](https://www.conventionalcommits.org/) para mantener el historial limpio:

| Prefijo     | Cuándo usarlo                               |
| ----------- | ------------------------------------------- |
| `feat:`     | Nueva funcionalidad                         |
| `fix:`      | Corrección de bug                           |
| `chore:`    | Configuración, estructura, dependencias     |
| `docs:`     | Cambios en documentación                    |
| `refactor:` | Refactorización sin cambio de funcionalidad |

**Ejemplos:**

```
feat: añadir endpoint para crear contenedor de fase
fix: corregir ruta del Dockerfile en phase-2
chore: añadir requirements.txt con dependencias base
docs: actualizar README con instrucciones de setup
```

---

## ⚙️ Requisitos previos

- [VirtualBox 7.0](https://www.virtualbox.org/wiki/Downloads)
- Python 3.10+ _(se instala con setup.sh)_
- Node.js 18+ _(se instala con setup.sh)_
- Docker _(se instala con setup.sh)_

---

## 👥 Equipo

| Parte                     | Responsable |
| ------------------------- | ----------- |
| Frontend                  | Zineb       |
| Backend / Infraestructura | Glaira      |
