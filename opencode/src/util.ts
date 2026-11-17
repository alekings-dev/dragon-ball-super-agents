import { appendFileSync, existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs"
import { homedir } from "node:os"
import { basename, join, resolve } from "node:path"
import { spawn } from "node:child_process"
import { fileURLToPath } from "node:url"

import { EQUIPO } from "../../hooks/equipo.ts"

/** Raíz del repo/paquete (este archivo vive en opencode/src/). */
export const RAIZ = resolve(fileURLToPath(new URL("../..", import.meta.url)))

export const DIR_EVENTOS = join(homedir(), ".claude", "equipo-dbs")
export const ARCHIVO_EVENTOS = join(DIR_EVENTOS, "eventos.jsonl")

export type EventoInicio = {
  t: number
  tipo: "inicio"
  rol: string
  tarea: string
  model: string
  effort: string
  proyecto: string
}

export type EventoFin = {
  t: number
  tipo: "fin"
  rol: string
  proyecto: string
  bloqueo: boolean
}

export type Evento = EventoInicio | EventoFin

/**
 * `equipo-dbs:producto`, `equipo-dbs/producto` y `producto` son el mismo rol.
 * Devuelve undefined si el agente no pertenece al equipo.
 */
export function rolDeAgente(agente: string | undefined | null): string | undefined {
  if (!agente) return undefined
  const rol = agente.replace(/^equipo-dbs[:/]/, "")
  return rol in EQUIPO ? rol : undefined
}

export type ModeloNormalizado = {
  /** ID del modelo sin proveedor, tal como lo esperan los scripts de voz. */
  id?: string
  /** Alias que entiende `hooks/transformacion.sh` ("opus") o el ID original. */
  model?: string
  variant?: string
  /** "high" cuando la variante es high/xhigh/max. */
  effort?: string
}

/** Acepta `provider/modelo#variante` o `{ providerID, id, variant }`. */
export function normalizarModelo(modelo: unknown): ModeloNormalizado {
  let ref: string | undefined
  let variant: string | undefined

  if (typeof modelo === "string") {
    const [referencia, variante] = modelo.split("#")
    ref = referencia
    variant = variante
  } else if (modelo && typeof modelo === "object") {
    const m = modelo as { id?: unknown; model?: unknown; variant?: unknown }
    if (typeof m.id === "string") ref = m.id
    else if (typeof m.model === "string") ref = m.model
    if (typeof m.variant === "string") variant = m.variant
  }

  if (!ref) return {}

  const id = ref.split("/").pop() || ref
  const alto = variant === "high" || variant === "xhigh" || variant === "max"

  return {
    id,
    variant,
    model: id.includes("opus") ? "opus" : id,
    effort: alto ? "high" : undefined,
  }
}

/**
 * Escribe una línea con el mismo formato que `hooks/evento.sh`.
 * Así `scripts/visor.mjs` y el mapa funcionan sin cambios.
 */
export function escribirEvento(evento: Evento): void {
  try {
    mkdirSync(DIR_EVENTOS, { recursive: true })
    appendFileSync(ARCHIVO_EVENTOS, `${JSON.stringify(evento)}\n`, "utf8")
    const lineas = readFileSync(ARCHIVO_EVENTOS, "utf8").split("\n").filter(Boolean)
    if (lineas.length > 2000) {
      writeFileSync(ARCHIVO_EVENTOS, `${lineas.slice(-500).join("\n")}\n`, "utf8")
    }
  } catch {
    // El mapa es opcional: si no se puede escribir, no se rompe la sesión.
  }
}

/**
 * Reproduce una voz reutilizando los scripts de Claude Code.
 * Los scripts leen el JSON por stdin, así que reciben un payload con el mismo esquema.
 */
export function hablar(script: "agente-termina.sh" | "transformacion.sh", payload: unknown): void {
  if (process.platform === "win32") return
  try {
    const hijo = spawn("sh", [join(RAIZ, "hooks", script)], {
      stdio: ["pipe", "ignore", "ignore"],
      detached: true,
    })
    hijo.on("error", () => {})
    hijo.stdin?.on("error", () => {})
    hijo.stdin?.end(JSON.stringify(payload))
    hijo.unref()
  } catch {
    // Sin `say`/`afplay` (o sin sh) el plugin funciona en silencio.
  }
}

export function proyectoDe(directory: string | undefined | null): string {
  return basename(directory || process.cwd())
}

export type SkillParseada = {
  name?: string
  description?: string
  content: string
}

/** Separa el frontmatter YAML simple (name/description) del cuerpo de un SKILL.md. */
export function parsearSkill(texto: string): SkillParseada {
  const match = texto.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/)
  if (!match) return { content: texto }

  const frontmatter = match[1] ?? ""
  const campo = (nombre: string) =>
    frontmatter.match(new RegExp(`^${nombre}:\\s*(.+)$`, "m"))?.[1]?.trim()

  return {
    name: campo("name"),
    description: campo("description"),
    content: texto.slice(match[0].length),
  }
}

/** Directorio global de agentes de OpenCode (`$XDG_CONFIG_HOME` o ~/.config). */
export function dirAgentesGlobal(): string {
  const base = process.env.XDG_CONFIG_HOME || join(homedir(), ".config")
  return join(base, "opencode", "agents", "equipo-dbs")
}

/**
 * Copia los agentes generados a `destino` sin pisar los que ya existen.
 * Devuelve los nombres de archivo instalados.
 */
export function instalarAgentes(destino: string): string[] {
  const origen = join(RAIZ, "opencode", "agentes", "equipo-dbs")
  if (!existsSync(origen)) return []

  mkdirSync(destino, { recursive: true })
  const escritos: string[] = []

  for (const nombre of readdirSync(origen)) {
    if (!nombre.endsWith(".md")) continue
    const archivoDestino = join(destino, nombre)
    if (existsSync(archivoDestino)) continue
    try {
      writeFileSync(archivoDestino, readFileSync(join(origen, nombre), "utf8"), { flag: "wx" })
      escritos.push(nombre)
    } catch {
      // Otro proceso lo escribió primero: está bien.
    }
  }

  return escritos
}

export type MensajeLike = {
  type?: string
  id?: string
  content?: ReadonlyArray<{ type?: string; text?: string }>
}

/** Texto del último mensaje del asistente (sin razonamiento ni llamadas a herramientas). */
export function ultimoTexto(mensajes: readonly MensajeLike[]): { id?: string; texto: string } | undefined {
  for (let i = mensajes.length - 1; i >= 0; i--) {
    const mensaje = mensajes[i]
    if (mensaje?.type !== "assistant") continue
    const texto = (mensaje.content ?? [])
      .filter((parte) => parte?.type === "text" && typeof parte.text === "string")
      .map((parte) => parte.text as string)
      .join("\n")
    return { id: mensaje.id, texto }
  }
  return undefined
}

/** Mismo criterio de bloqueo que `hooks/agente-termina.sh` y `hooks/evento.sh`. */
export function tieneBloqueo(texto: string): boolean {
  return /\*\*Bloquea\*\*|nuevos: [1-9]|❌|[Nn]o integré/.test(texto)
}
