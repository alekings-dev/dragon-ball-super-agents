# Equipo DBS en OpenCode

El mismo repo es un plugin de **OpenCode V2** (2.3 o más nuevo) además de Claude Code y Cursor. Esta guía cubre lo
propio de OpenCode; el resto se explica en el [README](../README.md).

## Qué aporta

| Pieza | En OpenCode |
| --- | --- |
| 10 especialistas | Agentes `equipo-dbs/<rol>` en `~/.config/opencode/agents/equipo-dbs/` (o en `.opencode/agents/equipo-dbs/` del proyecto) |
| `resolver-issue` | Skill registrada por el plugin + comando `/resolver-issue` |
| `mapa` | Skill + comando `/mapa`; el plugin escribe el mismo JSONL que el mapa ya lee |
| `configurar-modelos` | Skill + comando `/configurar-modelos` |
| Panel | `/equipo` en la TUI (`session.panel`); sin avatares pixel-art, con las caritas del equipo |
| Voces | Reutiliza `hooks/agente-termina.sh` y `hooks/transformacion.sh`; turnos con `hooks/turno.sh` |
| Transformaciones | `model: "<proveedor>/<modelo>#high"` para Super Saiyan Blue; el modelo `opus` del proveedor para Super Saiyan |

## Instalación

### Como paquete (recomendado)

```sh
opencode plugin add github:alekings-dev/dragon-ball-super-agents
```

Al cargar por primera vez, el plugin copia los agentes que falten a `~/.config/opencode/agents/equipo-dbs/` y recarga
la lista de agentes. Es idempotente: no pisa archivos existentes.

### Como directorio local

```sh
git clone https://github.com/alekings-dev/dragon-ball-super-agents ~/.config/opencode/plugins/dragon-ball-super-agents
```

Añade la ruta absoluta a `opencode.json(c)`:

```jsonc
{
  "$schema": "https://opencode.ai/config.json",
  "plugins": ["/Users/tu-usuario/.config/opencode/plugins/dragon-ball-super-agents"]
}
```

OpenCode también descubre directorios de paquete dentro de `~/.config/opencode/plugins/` y de `.opencode/plugins/` sin
configuración extra.

### Opciones

```jsonc
{
  "plugins": [
    {
      "package": "/ruta/al/repo",
      "options": {
        "agents": "global"
      }
    }
  ]
}
```

| Opción | Valores | Qué hace |
| --- | --- | --- |
| `agents` | `"global"` (por defecto) | Instala los agentes en `~/.config/opencode/agents/equipo-dbs/` |
| `agents` | `"project"` | Los instala en `<proyecto>/.opencode/agents/equipo-dbs/` |
| `agents` | `"off"` | No instala nada; útil si los agentes ya están versionados en el repo |

Si prefieres instalarlos a mano o actualizarlos tras cambiar de versión (desde un clon del repo):

```sh
node opencode/scripts/instalar-agentes.mjs --global
node opencode/scripts/instalar-agentes.mjs --project /ruta/al/repo --force
```

## Uso

| Acción | Claude Code | Cursor | OpenCode |
| --- | --- | --- | --- |
| Tomar una issue | `/equipo-dbs:resolver-issue ABC-12` | skill `resolver-issue` | `/resolver-issue ABC-12` |
| Cargar la skill | `/equipo-dbs:resolver-issue` | menú de skills | `@resolver-issue` |
| Abrir el mapa | `/equipo-dbs:mapa` | — | `/mapa` |
| Ver el panel | `/equipo` | — | `/equipo` (TUI) |
| Elegir modelos | no hace falta | `configurar-modelos` | `/configurar-modelos` |

El proyecto sigue usando `.claude/equipo/proyecto.md` y `.claude/equipo/bitacora/<rol>.md`. Es solo una ruta compartida:
los tres hosts leen y escriben los mismos archivos, así que las lecciones y decisiones no se duplican.

## Modelos

Los valores por defecto están en [`opencode/modelos.json`](../opencode/modelos.json):

```json
{
  "opus": "opencode/claude-opus-5-5",
  "sonnet": "opencode/claude-sonnet-5-5",
  "haiku": "opencode/claude-haiku-5-5"
}
```

Cámbialos por los IDs reales de tu proveedor. Puedes listarlos con `opencode models` (si tu versión lo incluye) o desde
la lista de modelos de la TUI. Después regenera los agentes y reinstálalos:

```sh
node opencode/scripts/generar-agentes.mjs
node opencode/scripts/instalar-agentes.mjs --global --force
```

También puedes editar directamente la línea `model:` de cada archivo instalado. Si la borras, el agente hereda el modelo
de la sesión principal. Para Super Saiyan Blue usa una variante: `opencode/claude-opus-5-5#high`.

## Voces y mapa

Las voces reutilizan los scripts de Claude Code, así que necesitan `sh`, `jq`, `say` y `afplay` (macOS). En otros
sistemas el plugin funciona en silencio.

El mapa funciona igual: el plugin escribe `~/.claude/equipo-dbs/eventos.jsonl` con el mismo formato que
`hooks/evento.sh`, y `scripts/visor.mjs` lo sirve en <http://localhost:4321> (requiere Node 23.6+).

## Diferencias con Claude Code

- **Los subagentes no bloquean.** `subagent` devuelve un `sessionID` al instante y el reporte llega después como mensaje
  `<subagent>`. La skill `resolver-issue` ya lo explica; no esperes el resultado en el mismo paso.
- **Hit debe ser un agente primario.** El anidamiento de subagentes es de un nivel por defecto: si conviertes a Hit en
  `mode: subagent`, no podrá lanzar a los especialistas. Úsalo como agente principal o como skill en la sesión.
- **Permisos traducidos.** Los `tools:` de Claude se convierten en reglas `permissions`: los agentes de solo lectura
  tienen `edit` denegado y los que no usan `Bash` tienen `shell` denegado. Los agentes sin `tools:` conservan acceso
  completo, igual que en Claude.
- **Nombres de herramientas.** `Read` → `read`, `Bash` → `shell`, `Agent`/`Task` → `subagent`,
  `AskUserQuestion` → `question`. Los MCP pasan de `mcp__linear-server__get_issue` a `linear-server_get_issue`.
- **Panel sin pixel art.** La TUI no tiene el `Image` de Claude Code; el panel usa las caritas y colores del equipo.
- **Panel vacío al principio.** Solo lista sesiones hijas de la sesión actual; aparece contenido cuando Hit delega.

## Problemas comunes

| Síntoma | Qué revisar |
| --- | --- |
| No aparecen los agentes | Corre el instalador, revisa la carpeta global y usa `/reload`; el plugin solo escribe los que faltan |
| No se oye nada | macOS, `say`/`afplay` y `jq`; los audios están en `hooks/voces/` |
| El mapa no se llena | Que el plugin esté cargado, que exista `~/.claude/equipo-dbs/eventos.jsonl` y que `visor.mjs` corra con Node 23.6+ |
| El panel no abre | `/equipo` es de la TUI; en clientes sin TUI usa el mapa o los reportes |
| Un modelo no existe | Ajusta `opencode/modelos.json` o el `model:` del agente instalado y recarga |
