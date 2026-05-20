# Troubleshooting

Problemas conocidos y sus soluciones, encontrados durante el desarrollo.

---

## VM entra en estado `GuruMeditation` al arrancar

**Síntoma**: La VM no arranca y aparece el error `VERR_VMM_SET_JMP_ABORTED_RESUME`.

**Causa**: VirtualBox 6.1 (el que instala `apt` de Ubuntu por defecto) es incompatible con kernels Linux 6.x.

**Solución**: Instalar VirtualBox 7.0 desde el repositorio oficial de Oracle.

```bash
sudo apt remove --purge virtualbox* -y
wget -O- https://www.virtualbox.org/download/oracle_vbox_2016.asc | \
  sudo gpg --dearmor --yes --output /usr/share/keyrings/oracle-virtualbox-2016.gpg
echo "deb [arch=amd64 signed-by=/usr/share/keyrings/oracle-virtualbox-2016.gpg] \
  https://download.virtualbox.org/virtualbox/debian jammy contrib" | \
  sudo tee /etc/apt/sources.list.d/virtualbox.list
sudo apt update && sudo apt install virtualbox-7.0 -y
```

---

## `docker pull` falla con error de certificado TLS

**Síntoma**:
```
tls: failed to verify certificate: x509: certificate is not valid for any names
```

**Causa**: FortiClient VPN instala un driver de red que intercepta tráfico TLS incluso estando desconectado. La VM en modo NAT hereda este tráfico y recibe un certificado autofirmado en lugar del legítimo de Docker.

**Cómo confirmar**:
```bash
openssl s_client -connect registry-1.docker.io:443 </dev/null 2>&1 | grep -E "subject|issuer"
# Si ves "Widgits Pty Ltd" o "Packetland" en lugar de "docker.com" -> es FortiClient
```

**Solución**: Cambiar la VM de modo NAT a modo **bridged**.

```bash
# Con la VM apagada, desde el host:
sudo rm -f /tmp/SecLabs-serial   # limpiar socket serie si da error de bloqueo
VBoxManage modifyvm "SecLabs-Lab" --nic1 bridged --bridgeadapter1 wlp1s0
VBoxManage startvm "SecLabs-Lab" --type headless
```

> Sustituye `wlp1s0` por el nombre de tu interfaz wifi (`ip link` para verlo).
> Si no tienes FortiClient, el modo NAT funciona sin problemas y no necesitas hacer esto.

---

## SSH con NAT (puerto 2222) no funciona

**Síntoma**: `ssh -p 2222 glaira@localhost` no conecta o no aparece en `auth.log`.

**Causa**: Problema conocido en este entorno, posiblemente relacionado con FortiClient.

**Solución**: Usar la interfaz host-only (`enp0s8`). El `setup.sh` la configura automáticamente. Para ver qué IP tiene dentro de la VM:

```bash
ip addr show enp0s8
```

Luego conecta desde el host:
```bash
ssh <tu_usuario>@<IP_de_enp0s8>
```

---

## Fijar la IP de `enp0s8` como estática

Por defecto el `setup.sh` usa DHCP y la IP puede cambiar entre reinicios. Para fijarla:

```bash
# Dentro de la VM — sustituye la IP por la que quieras fijar
sudo tee /etc/netplan/99-host-only.yaml > /dev/null <<'EOF'
network:
  version: 2
  ethernets:
    enp0s8:
      addresses: [192.168.56.102/24]
EOF
sudo chmod 600 /etc/netplan/99-host-only.yaml
sudo netplan apply
```

---

## `VBoxManage list extpacks` devuelve 0 extpacks

**Causa**: El Extension Pack se instaló con `sudo`, solo visible para root.

**Solución**: Usar `sudo VBoxManage` para operaciones con VRDE/RDP y registrar la VM con sudo:

```bash
sudo VBoxManage registervm ~/VirtualBox\ VMs/SecLabs-Lab/SecLabs-Lab.vbox
sudo VBoxManage modifyvm "SecLabs-Lab" --vrde on --vrdeport 3389
sudo VBoxManage startvm "SecLabs-Lab" --type headless
```

---

## Error al arrancar: socket `/tmp/SecLabs-serial` bloqueado

**Causa**: La VM fue arrancada anteriormente con `sudo`, dejando el socket con permisos de root.

**Solución**:
```bash
sudo rm -f /tmp/SecLabs-serial
VBoxManage startvm "SecLabs-Lab" --type headless
```
