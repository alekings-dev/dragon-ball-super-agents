import { existsSync, readFileSync } from "node:fs"
import { join } from "node:path"

import { Plugin, Skill } from "@opencode/plugin"

import {
  RAIZ,
  dirAgentesGlobal,
  escribirEvento,
  hablar,
  instalarAgentes,
  normalizarModelo,
  parsearSkill,
  proyectoDe,
  rolDeAgente,
  tieneBloqueo,
  ultimoTexto,
  type MensajeLike,
} from "./util.ts"

/**
 * Skills y comandos que el plugin aporta. El cuerpo real se lee de skills/<id>/SKILL.md
 * para que Claude Code, Cursor y OpenCode compartan el mismo texto.
 */
const SKILLS = [
  {
    id: "resolver-issue",
    comando: "resolver-issue",
    descripcion:
      "Líder técnico (Hit): toma una issue, la reparte entre los especialistas, revisa, abre el PR y lo integra",
  },
  {
    id: "mapa",
    comando: "mapa",
    descripcion: "Abre en el navegador el mapa del equipo Dragon Ball (una sala por especialista)",
  },
  {
    id: "configurar-modelos",
    comando: "configurar-modelos",
    descripcion: "Elige el modelo de cada especialista del equipo Dragon Ball",
  },
] as const

type Limpieza = () => void | Promise<void>

/**
 * OpenCode crea una instancia del plugin por cada location abierta y todas reciben el
 * mismo stream de eventos del servidor. Este set compartido en globalThis evita que un
 * subagente haga sonar la voz o escriba el evento una vez por cada location (y también
 * sobrevive a una recarga del módulo).
 */
const compartido = globalThis as unknown as { __equipoDbsAtendidos?: Set<string> }
const atendidos = (compartido.__equipoDbsAtendidos ??= new Set<string>())

function marcarAtendido(clave: string): boolean {
  if (atendidos.has(clave)) return false
  atendidos.add(clave)
  if (atendidos.size > 1000) {
    for (const vieja of [...atendidos].slice(0, 500)) atendidos.delete(vieja)
  }
  return true
}

export default Plugin.define({
  id: "equipo-dbs",
  async setup(ctx) {
    const limpiezas: Limpieza[] = []

    // 1. Agentes: OpenCode no permite registrarlos desde un plugin, así que se instalan
    //    como archivos (global por defecto) para que aparezcan como subagentes.
    const modoAgentes = typeof ctx.options.agents === "string" ? ctx.options.agents : "global"
    if (modoAgentes !== "off") {
      const destino =
        modoAgentes === "project"
          ? join(ctx.location.directory, ".opencode", "agents", "equipo-dbs")
          : dirAgentesGlobal()

      const escritos = instalarAgentes(destino)
      if (escritos.length > 0) {
        console.log(`[equipo-dbs] ${escritos.length} agentes instalados en ${destino}`)
        await ctx.agent.reload()
      }
    }

    // 2. Skills: se registran apuntando a la carpeta del paquete; si el repo ya define
    //    una skill con el mismo ID, se respeta la del repo.
    await ctx.skill.transform((editor) => {
      for (const skill of SKILLS) {
        if (editor.get(skill.id)) continue
        const enProyecto = join(ctx.location.directory, "skills", skill.id, "SKILL.md")
        const enPaquete = join(RAIZ, "skills", skill.id, "SKILL.md")
        const ruta = existsSync(enProyecto) ? enProyecto : enPaquete
        if (!existsSync(ruta)) continue

        const { name, description, content } = parsearSkill(readFileSync(ruta, "utf8"))
        editor.add({
          id: Skill.ID.make(skill.id),
          name: Skill.Name.make(name || skill.id),
          description: description || skill.descripcion,
          path: Skill.Info.fields.path.make(ruta),
          content,
        })
      }
    })

    // 3. Comandos de barra: cargan la skill correspondiente y le pasan los argumentos.
    await ctx.command.transform((editor) => {
      for (const skill of SKILLS) {
        editor.add({
          name: skill.comando,
          description: skill.descripcion,
          execute: async ({ sessionID, prompt, delivery }) => {
            await ctx.session.prompt({
              ...prompt,
              sessionID,
              text: `Carga la skill \`${skill.id}\` con la herramienta skill y síguela al pie de la letra.\n\n${prompt.text}`,
              delivery,
            })
          },
        })
      }
    })

    // 4. Delegaciones: mismo rol que PreToolUse(Agent) en Claude Code.
    const inicio = await ctx.tool.hook("execute.before", (event) => {
      if (event.tool !== "subagent") return

      const input = (event.input ?? {}) as { agent?: string; description?: string; model?: unknown }
      const rol = rolDeAgente(input.agent)
      if (!rol) return

      const modelo = normalizarModelo(input.model)
      const tarea = typeof input.description === "string" ? input.description : ""

      escribirEvento({
        t: Date.now(),
        tipo: "inicio",
        rol,
        tarea,
        model: modelo.model ?? "",
        effort: modelo.effort ?? "",
        proyecto: proyectoDe(ctx.location.directory),
      })

      if (modelo.model === "opus" || modelo.effort === "high") {
        hablar("transformacion.sh", {
          tool_input: {
            subagent_type: rol,
            model: modelo.model ?? "",
            effort: modelo.effort ?? "",
          },
        })
      }
    })
    limpiezas.push(() => inicio.dispose())

    // 5. Entregas: SubagentStop/Stop en Claude Code. En OpenCode los subagentes son
    //    asíncronos, así que se escucha el final de la ejecución de cada sesión hija.
    const control = new AbortController()

    void (async () => {
      try {
        for await (const evento of ctx.event.subscribe({
          types: ["session.execution.succeeded", "session.execution.failed"],
          signal: control.signal,
        })) {
          const sessionID = evento.data.sessionID
          const fallo = evento.type === "session.execution.failed"

          try {
            const sesion = await ctx.session.get({ sessionID })
            const rol = rolDeAgente(sesion.agent)

            // El líder (Hit) habla cuando su respuesta trae la firma.
            if (!rol) {
              if (sesion.parentID) continue
              const mensajes = (await ctx.session.context({ sessionID })) as unknown as MensajeLike[]
              const ultimo = ultimoTexto(mensajes)
              if (!ultimo?.texto.includes("(⌐■_■) Hit")) continue

              const clave = `${sessionID}:${ultimo.id ?? "sin-id"}:lider`
              if (!marcarAtendido(clave)) continue
              hablar("agente-termina.sh", { agent_type: "", last_assistant_message: ultimo.texto })
              continue
            }

            const mensajes = (await ctx.session.context({ sessionID })) as unknown as MensajeLike[]
            const ultimo = ultimoTexto(mensajes)
            const clave = `${sessionID}:${ultimo?.id ?? (fallo ? "failed" : "ok")}`
            if (!marcarAtendido(clave)) continue

            const texto = ultimo?.texto ?? (fallo ? "**Bloquea**" : "")
            const bloqueo = fallo || tieneBloqueo(texto)
            const directorio = (sesion.location as { directory?: string } | undefined)?.directory

            escribirEvento({
              t: Date.now(),
              tipo: "fin",
              rol,
              proyecto: proyectoDe(directorio ?? ctx.location.directory),
              bloqueo,
            })

            hablar("agente-termina.sh", { agent_type: rol, last_assistant_message: texto })
          } catch {
            // Una sesión borrada o un mensaje ilegible no deben cortar el stream.
          }
        }
      } catch {
        // El stream se aborta al descargar el plugin.
      }
    })()

    limpiezas.push(() => control.abort())

    return async () => {
      for (const limpiar of limpiezas.reverse()) {
        try {
          await limpiar()
        } catch {
          // limpieza best-effort
        }
      }
    }
  },
})
