# equipo-dbs

Panel de Claude Code que muestra el equipo de agentes con personajes de Dragon Ball Super: quién trabaja, en qué y quién terminó.

El panel reconoce los subagentes con estos tipos (archivos en `.claude/agents/` del repo donde lo uses):

| Tipo | Personaje |
| --- | --- |
| `producto` | Bulma |
| `arquitecto` | Bills |
| `backend` | Vegeta |
| `frontend` | Goku |
| `fullstack` | Gohan |
| `devops` | Piccolo |
| `seguridad` | Freezer |
| `qa` | Trunks |
| `critico-diseno` | Vados |
| `escritor` | Kaio-sama |

## Instalación

En el prompt de una sesión de Claude Code en la terminal:

```
/plugin install equipo-dbs --marketplace alekings-dev/dragon-ball-super-agents
```

Responde `y` para agregar el marketplace y elige el alcance (usuario, por defecto).

Desde la shell:

```
claude plugin install equipo-dbs --marketplace alekings-dev/dragon-ball-super-agents
```

En la app de escritorio: clic en + junto al cuadro del prompt, luego Plugins, Add marketplace con `alekings-dev/dragon-ball-super-agents`, luego Add plugin.

El repositorio es privado: solo se instala para quienes tengan acceso en GitHub y una credencial de git para github.com en su equipo (una llave SSH, o `gh auth login` y luego `gh auth setup-git`).

## Uso

El panel se abre al iniciar la sesión. Para abrirlo de nuevo: `/equipo`.
