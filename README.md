# Secure AI Pipeline — TFG

Educational platform for learning security in AI pipelines. It allows users to run a complete AI pipeline, explore vulnerabilities in an isolated environment, and restore a clean pipeline once the lab is finished.

---

## 📁 Project structure

```text
Secure_AI/
├── backend/
│   ├── api/                        # REST API that manages containers dynamically
│   ├── labs/
│   │   ├── phase-1-ingestion/      # Isolated container — Phase 1
│   │   ├── phase-2-input/          # Isolated container — Phase 2
│   │   ├── phase-3-model/          # Isolated container — Phase 3
│   │   └── phase-4-output/         # Isolated container — Phase 4
│   ├── pipelines/
│   │   ├── docker-compose.e1.yml   # E1: functional general pipeline
│   │   ├── docker-compose.e3-p1.yml
│   │   ├── docker-compose.e3-p2.yml
│   │   ├── docker-compose.e3-p3.yml
│   │   └── docker-compose.e3-p4.yml # E3: post-lab cleanup per phase
│   └── requirements.txt
├── frontend/                        # User interface (React)
├── docker-compose.yml               # Root Compose file
├── setup.sh                         # Development environment setup (run inside the VM)
└── TROUBLESHOOTING.md               # Known issues and solutions
```

### The three system states

| State  | Description                                                                                       |
| ------ | ------------------------------------------------------------------------------------------------- |
| **E1** | Functional general pipeline — the user can see the complete pipeline running                      |
| **E2** | Interactive lab — each phase runs in an isolated container, dynamically managed from the frontend |
| **E3** | Post-lab cleanup — E2 containers are destroyed and the clean environment is restored              |

---

## 🖥️ Development environment setup

The backend runs inside a VM (VirtualBox + Ubuntu Server). The frontend calls the backend through a REST API from outside the VM.

### 1. Install VirtualBox 7.0

> If you already have VirtualBox 7.0 installed, skip to step 2.  
> If you have VirtualBox 6.1, you must upgrade it — see [TROUBLESHOOTING.md](TROUBLESHOOTING.md).

Download and install VirtualBox 7.0 from the [official website](https://www.virtualbox.org/wiki/Downloads).

On **Linux (Ubuntu/Debian)**, install it from Oracle's official repository:

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

### 2. Create the VM

Download the Ubuntu Server 22.04 ISO:

```bash
wget https://releases.ubuntu.com/22.04.5/ubuntu-22.04.5-live-server-amd64.iso -P ~/Downloads/
```

Create and configure the VM:

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

### 3. Install Ubuntu Server

Start the VM:

```bash
VBoxManage startvm "SecureAI-Lab" --type headless
```

Connect to view the installation screen:

```bash
# Option A — SSH (when the installer allows it)
ssh -p 2222 <your_user>@localhost

# Option B — RDP with Remmina (requires the Extension Pack installed)
# New connection → RDP → localhost:3389
```

Follow the Ubuntu Server installer. When prompted:

- **Installer update**: select _Continue without updating_
- **SSH**: enable _Install OpenSSH server_
- **Additional snaps**: do not select any (Docker is installed by setup.sh)

Once installed, the VM will reboot. Connect through SSH:

```bash
ssh <your_user>@<enp0s8_IP>
# To see the IP: ip addr show enp0s8
```

> If SSH does not work through NAT (port 2222), see [TROUBLESHOOTING.md](TROUBLESHOOTING.md).

### 4. Clone the repository and run the setup

Inside the VM:

```bash
git clone https://github.com/ZB-GD/Secure_AI.git
cd Secure_AI
chmod +x setup.sh
./setup.sh
```

The script installs Docker, Python 3, Node.js, and configures the permanent host-only network. At the end, it shows the VM IP you can use to connect through SSH.

> If `docker pull` fails with a TLS certificate error, see [TROUBLESHOOTING.md](TROUBLESHOOTING.md) (known issue with FortiClient VPN).

### 5. Daily VM usage

```bash
# Start the VM (from the host)
VBoxManage startvm "SecureAI-Lab" --type headless

# Connect through SSH
ssh <your_user>@<enp0s8_IP>

# Power off the VM
VBoxManage controlvm "SecureAI-Lab" poweroff
```

---

## 🌿 Git workflow

The project uses one integration branch (`dev`) and fixed branches per area/person. The idea is simple: **nobody works directly on `dev` or `main`**. Each person works on their own branch, pushes changes, and opens a Pull Request into `dev`.

### Branches

```text
main
└── dev                           ← stable integration
    ├── feature/backend-glaira    ← backend and infrastructure
    └── feature/frontend-zineb    ← user interface
```

- **`main`**: main/production branch. It only receives merges from `dev` when everything is stable.
- **`dev`**: integration branch. Validated changes are merged here through Pull Requests.
- **`feature/backend-glaira`**: fixed branch for backend and infrastructure.
- **`feature/frontend-zineb`**: fixed branch for frontend.

> The `feature/*` branches are permanent working branches. They are not deleted after each PR.

---

### Initial setup (only the first time)

```bash
git clone <repo-url>
cd Secure_AI

# Fetch remote branches
git fetch origin

# Switch to dev and update it
git switch dev
git pull origin dev

# Switch to your fixed branch
git switch feature/backend-glaira
# or, for frontend:
git switch feature/frontend-zineb
```

If your fixed branch does not exist locally yet, but it already exists remotely:

```bash
git switch --track origin/feature/backend-glaira
# or:
git switch --track origin/feature/frontend-zineb
```

---

### Daily workflow

Before editing code, update `dev` and sync your branch with it.

```bash
# 1. Update dev
git switch dev
git pull origin dev

# 2. Go back to your fixed branch
git switch feature/backend-glaira
# or:
git switch feature/frontend-zineb

# 3. Bring the latest dev changes into your branch
git merge dev

# 4. Work... make changes in VS Code...

# 5. Review changes
git status

# 6. Stage and commit
git add .
git commit -m "feat: short description of the change"

# 7. Push your branch
git push origin feature/backend-glaira
# or:
git push origin feature/frontend-zineb
```

---

### Create a Pull Request into `dev`

A Pull Request (PR) is used to integrate the changes from your branch into `dev` without overwriting the other person's work.

```text
feature/backend-glaira ──── PR ────► dev ──── PR ────► main
feature/frontend-zineb ──── PR ────► dev
```

**PR configuration:**

```text
base: dev
compare: feature/backend-glaira
```

or, for frontend:

```text
base: dev
compare: feature/frontend-zineb
```

**Steps on GitHub:**

1. Go to **Pull Requests** → **New pull request**.
2. Select `dev` as the base branch.
3. Select your `feature/...` branch as the compare branch.
4. Add a title and a short description.
5. Create the PR.
6. Review conflicts if they appear.
7. Merge once it has been validated.

**From VS Code:**

1. Open the **GitHub Pull Requests and Issues** extension.
2. Click **Create Pull Request**.
3. Check that the base branch is `dev` and the compare branch is your branch.
4. Add a title and description.
5. Create the PR.

---

### After merging a PR

Because the `feature/*` branches are fixed, **they are not deleted**. After the merge, they must be synced again with `dev`.

```bash
# 1. Update dev
git switch dev
git pull origin dev

# 2. Go back to your fixed branch
git switch feature/backend-glaira
# or:
git switch feature/frontend-zineb

# 3. Sync your branch with dev
git merge dev

# 4. Push the synced branch
git push origin feature/backend-glaira
# or:
git push origin feature/frontend-zineb
```

This prevents your branch from falling behind `dev` and reduces conflicts in the next PR.

---

### Useful diagnostic commands

Check which branch you are on and whether there are pending changes:

```bash
git status
```

Show local branches and their relationship with the remote branches:

```bash
git branch -vv
```

Show local commits that have not been pushed yet:

```bash
git log origin/<your-branch>..HEAD --oneline
```

Example:

```bash
git log origin/feature/backend-glaira..HEAD --oneline
```

Show remote branches:

```bash
git branch -r
```

Update remote references:

```bash
git fetch origin
```

---

### Commit convention

We use [Conventional Commits](https://www.conventionalcommits.org/) to keep the history clean:

| Prefix      | When to use it                         |
| ----------- | -------------------------------------- |
| `feat:`     | New feature                            |
| `fix:`      | Bug fix                                |
| `chore:`    | Configuration, structure, dependencies |
| `docs:`     | Documentation changes                  |
| `refactor:` | Refactoring without functional changes |

**Examples:**

```text
feat: add endpoint to create phase container
fix: correct Dockerfile path in phase-2
chore: add requirements.txt with base dependencies
docs: update README with setup instructions
```

---

## ⚙️ Requirements

- [VirtualBox 7.0](https://www.virtualbox.org/wiki/Downloads)
- Python 3.10+ _(installed by setup.sh)_
- Node.js 18+ _(installed by setup.sh)_
- Docker _(installed by setup.sh)_

---

## 👥 Team

| Area                     | Owner  |
| ------------------------ | ------ |
| Frontend                 | Zineb  |
| Backend / Infrastructure | Glaira |
