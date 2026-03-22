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
└── docker-compose.yml               # Compose raíz
```

### Los tres estados del sistema

| Estado | Descripción                                                                                            |
| ------ | ------------------------------------------------------------------------------------------------------ |
| **E1** | Pipeline general funcional — el usuario puede ver el pipeline completo corriendo                       |
| **E2** | Lab interactivo — cada fase corre en un contenedor aislado, gestionado dinámicamente desde el frontend |
| **E3** | Limpieza post-lab — se destruyen los contenedores del E2 y se restaura el entorno limpio               |

---

## 🌿 Flujo de trabajo con Git

### Ramas

```
main
└── dev                        ← integración estable
    ├── feature/backend-glaira ← backend e infraestructura
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

- [Docker](https://www.docker.com/) + Docker Compose
- [VirtualBox](https://www.virtualbox.org/) con VBoxManage accesible desde terminal
- Python 3.10+
- Node.js 18+

---

## 👥 Equipo

| Parte                     | Responsable |
| ------------------------- | ----------- |
| Frontend                  | Zineb       |
| Backend / Infraestructura | Glaira      |
