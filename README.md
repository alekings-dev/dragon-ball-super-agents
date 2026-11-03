# equipo-dbs

Equipo de agentes de Claude Code con personajes de Dragon Ball Super:

- **Agentes** (`agents/`): 10 especialistas, `equipo-dbs:<rol>`.
- **Skill** `equipo-dbs:resolver-issue`: Hitto, el líder, toma una issue de Linear, la reparte en el equipo, integra y reporta.
- **Skill** `configurar-modelos` (Cursor): pregunta qué modelo usa cada especialista y lo deja en `.cursor/agents/`.
- **Panel** (`/equipo`, solo Claude Code): quién trabaja, en qué y quién terminó, con el color, la frase y el avatar de pixel art de cada personaje, su transformación (⚡SSJ, ⚡SSJ Blue) y el tiempo de cada tarea.
- **Voces** (solo Claude Code): cada personaje avisa al terminar.
- **Mapa** (skill `mapa`, solo Claude Code): vista en el navegador con una sala por especialista, Hitto al centro y el feed «En vivo».

Roles y personajes:

| Tipo | Personaje |
| --- | --- |
| `producto` | Androide 18 |
| `arquitecto` | Bills |
| `backend` | Vegeta |
| `frontend` | Goku |
| `fullstack` | Gohan |
| `devops` | Piccolo |
| `seguridad` | Freezer |
| `qa` | Trunks |
| `critico-diseno` | Jiren |
| `escritor` | Kuririn |

## Avatares

Avatares originales de pixel art (16×16), generados por `scripts/generar-avatares.py` en `hooks/avatares.ts`. Se dibujan en terminales con gráficos (Kitty, iTerm2, WezTerm, Ghostty); en las demás aparece la carita del personaje.

## Mapa

`hooks/evento.sh` anota cada delegación de Hitto (`PreToolUse` de Agent) y cada entrega (`SubagentStop`) en `~/.claude/equipo-dbs/eventos.jsonl` (se recorta solo a las últimas 500 líneas). `scripts/visor.mjs` sirve `visor/` en `http://localhost:4321` (solo `127.0.0.1`) y transmite los eventos por SSE; los nombres, colores, frases y transformaciones salen de `hooks/equipo.ts`, el mismo archivo que usa el panel.

```sh
node scripts/visor.mjs        # o la skill «mapa», que además abre el navegador
sh hooks/evento.test.sh       # prueba del hook
```

El arte del mapa (suelos, muebles, rocas, la fuente de Hitto y la isla) es pixel art original de 16×16, generado por `scripts/generar-arte.py` en `visor/arte.js`.

Los personajes del mapa son sprites de fans de la colección «Dragon Ball Sagas» (autores en `visor/sprites/CREDITOS.md`). `scripts/importar-sprites.py` les quita el fondo y arma una hoja por rol en `visor/sprites/` (una fila por animación: quieto, camina, aura, entrega, caída); qué cuadro va en cada animación se elige en el diccionario `EQUIPO` del script. En el mapa, cuando Hitto delega, el personaje camina desde la plaza hasta su sala; cuando entrega, va a la plaza, hace su pose (o cae, si hay bloqueo) y vuelve. Con transformación trabaja con su aura.

```sh
python3 scripts/importar-sprites.py "/ruta/a/Dragon Ball Sagas"   # requiere Pillow
```

Requiere Node 23.6 o más nuevo (carga `hooks/*.ts` sin compilar) y `jq`.

## Voces

Cada personaje avisa con su voz cuando termina (`hooks/agente-termina.sh`, en `SubagentStop` y `Stop`; Hitto cuando la respuesta trae la firma «(⌐■_■) Hitto»). Si el reporte trae un bloqueo, suena la versión de alerta. Al delegar con transformación (`model: opus` o `effort` alto), el personaje grita al entrar (`hooks/transformacion.sh`).

Los audios están en `hooks/voces/`. Para regenerarlos con Fish Audio: `FISH_API_KEY=... hooks/generar-voces.sh` (`-f` para sobrescribir); frases y voces en `hooks/voces.tsv` y `hooks/transformaciones.tsv`.

Solo suena en macOS (`afplay` y `say`).

## Configurar un repo

El equipo es genérico; lo propio de cada repo va en `.claude/equipo/proyecto.md` (versiónalo). Las lecciones que aprende cada rol se guardan en `.claude/equipo/bitacora/<rol>.md`. Plantilla:

```markdown
# Proyecto: <nombre>

## Producto
Qué es, para quién, tono de los textos.

## Stack
Carpetas, frameworks y comandos (tests, tipos, build, levantar local, e2e).

## Git y PRs
- Rama base: `<base>`.
- Identidad de commits y prefijos de los mensajes.
- La persona a cargo es <nombre>.

## Linear
Equipo, proyecto y prefijo de issues.

## Límites
Usuarios de prueba, cómo se lee producción.

## Contexto
Documentos que el líder debe revisar (informe UX, decisiones previas).

## Verificaciones finales
Comandos que corre el líder antes del PR.

## Deploy
Cómo verifica devops el deploy tras integrar.

## Por rol
### backend
Patrones y carpetas propias. (Igual para otros roles si hace falta.)
```

Algunos agentes usan las herramientas MCP de Linear (`producto`, `critico-diseno`) y CodeGraph (`arquitecto`); sin esos servidores, trabajan sin ellas.

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

## Cursor

El mismo repo es un plugin de Cursor (`.cursor-plugin/`): trae los agentes y las skills, sin panel ni voces.

Instalación (repo privado: necesitas acceso en GitHub y tu credencial de git):

```
git clone https://github.com/alekings-dev/dragon-ball-super-agents ~/.cursor/plugins/local/dragon-ball-super-agents
```

Reinicia Cursor y revisa que aparezca en Settings → Plugins. Para actualizar: `git -C ~/.cursor/plugins/local/dragon-ball-super-agents pull`. Usa una carpeta real, no un enlace simbólico.

Modelos: la primera vez que uses `resolver-issue` en un repo, Hitto corre `configurar-modelos`. Te propone los modelos por defecto por nivel (Opus para Bills y Freezer, Sonnet para los implementadores, QA, producto y diseño, Haiku para el escritor), te pregunta si los aceptas o cuáles cambiar y escribe `.cursor/agents/<rol>.md`. Para cambiarlos después, pídele «configura los modelos del equipo». Versiona `.cursor/agents/` si quieres que todo el equipo use los mismos, y vuelve a correr la skill al actualizar el plugin.

Cursor ignora sin aviso un ID de modelo que no reconoce (usa el de la sesión principal): la skill solo usa IDs que confirmes.

## Uso

El panel se abre al iniciar la sesión. Para abrirlo de nuevo: `/equipo`.
