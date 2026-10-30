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

## Voces

Cada personaje avisa con su voz cuando termina (`hooks/agente-termina.sh`, en `SubagentStop` y `Stop`; Whis cuando la respuesta trae la firma «(◕‿◕) Whis»). Si el reporte trae un bloqueo, suena la versión de alerta. Al delegar con transformación (`model: opus` o `effort` alto), el personaje grita al entrar (`hooks/transformacion.sh`).

Los audios están en `hooks/voces/`. Para regenerarlos con Fish Audio: `FISH_API_KEY=... hooks/generar-voces.sh` (`-f` para sobrescribir); frases y voces en `hooks/voces.tsv` y `hooks/transformaciones.tsv`.

Solo suena en macOS (`afplay` y `say`).

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
