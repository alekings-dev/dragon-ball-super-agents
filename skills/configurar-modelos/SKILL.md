---
name: configurar-modelos
description: Configura qué modelo usa cada especialista del equipo Dragon Ball en Cursor. Pregunta a la persona a cargo (con los modelos por defecto como propuesta) y escribe `.cursor/agents/<rol>.md` en el repo. Úsala cuando pidan «configura los modelos del equipo», «cambia el modelo de Vegeta», o cuando `resolver-issue` corre en Cursor y el repo no tiene `.cursor/agents/`.
---

# Configurar los modelos del equipo (Cursor)

Eres **Hitto**. Firma tus mensajes a la persona a cargo con `(⌐■_■) Hitto`.

En Claude Code esta skill no hace falta: cada agente ya trae su modelo en el frontmatter y Hitto lo transforma al delegar. Si corres en Claude Code, dilo y termina.

## 1. Proponer los modelos por defecto
Los agentes del plugin están en la carpeta `agents/` del plugin, dos niveles arriba de este `SKILL.md` (`<carpeta de esta skill>/../../agents/<rol>.md`). Su campo `model:` dice el nivel de cada rol:

| Nivel (`model:` del plugin) | Roles | Propuesta en Cursor |
|---|---|---|
| `opus` | `arquitecto` (Bills), `seguridad` (Freezer) | `claude-opus-5` |
| `sonnet` | `producto` (Androide 18), `backend` (Vegeta), `frontend` (Goku), `fullstack` (Gohan), `devops` (Piccolo), `qa` (Trunks), `critico-diseno` (Jiren) | el Claude Sonnet más reciente del selector de modelos de Cursor |
| `haiku` | `escritor` (Kuririn) | el Claude Haiku más reciente del selector de modelos de Cursor |

Lee el nivel real desde los archivos (no lo supongas de esta tabla, puede haber cambiado).

Los IDs de modelo de Cursor cambian con cada versión y un ID que Cursor no reconoce se ignora sin aviso (el subagente usa el modelo de la sesión principal). Por eso:
- Usa solo IDs que la persona confirme o que veas en su configuración de Cursor (Settings → Models). Si no sabes el ID exacto de un nivel, pregúntalo; no lo inventes.
- `inherit` (el mismo modelo de la sesión principal) siempre es válido.
- Las opciones de modelo van entre corchetes: `claude-opus-5[effort=high]`.

## 2. Preguntar
Muestra la tabla con la propuesta por rol (personaje, rol, nivel, modelo propuesto) y pregunta, con opciones si tienes una herramienta de preguntas y si no en el chat:
1. ¿Usar los modelos por defecto? (recomendado)
2. ¿Cambiar el modelo de algún nivel completo? (por ejemplo, todos los `sonnet` a `composer-2.5`)
3. ¿Cambiar el de algún rol en particular?
4. ¿Usar `inherit` para todos?

Espera la respuesta. Si la persona pide algo ambiguo («algo más barato»), propón un ID concreto y confírmalo.

## 3. Escribir `.cursor/agents/`
Por cada rol, copia `agents/<rol>.md` del plugin a `.cursor/agents/<rol>.md` del repo, cambiando **solo** la línea `model:` del frontmatter por el modelo elegido (con `inherit`, borra la línea). No toques el resto del archivo: el cuerpo es el mismo agente del plugin. En Cursor, los agentes de `.cursor/agents/` tienen prioridad sobre los demás con el mismo nombre.

Si `.cursor/agents/<rol>.md` ya existe, muestra el modelo actual y el nuevo antes de sobrescribir.

## 4. Reportar
Una tabla final: personaje, rol, modelo. Recuerda a la persona:
- Versionar `.cursor/agents/` si quiere que el equipo use los mismos modelos.
- Volver a correr esta skill cuando actualice el plugin (las copias no se actualizan solas) o quiera cambiar un modelo.
