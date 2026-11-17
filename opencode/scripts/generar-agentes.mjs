#!/usr/bin/env node
// Genera los agentes de OpenCode a partir de los agentes de Claude Code/Cursor.
// Una sola fuente (agents/*.md); este script traduce el frontmatter y los nombres
// de herramientas. Uso: node opencode/scripts/generar-agentes.mjs
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs"
import { join } from "node:path"
import { fileURLToPath } from "node:url"

const RAIZ = fileURLToPath(new URL("../..", import.meta.url))
const ORIGEN = join(RAIZ, "agents")
const DESTINO = join(RAIZ, "opencode", "agentes", "equipo-dbs")
const MODELOS = JSON.parse(readFileSync(join(RAIZ, "opencode", "modelos.json"), "utf8"))

// Colores de hooks/equipo.ts (hex; OpenCode no acepta nombres como "cyan").
const COLORES = {
  producto: "#d4a62a",
  arquitecto: "#a07ad2",
  backend: "#2f62c8",
  frontend: "#f08220",
  fullstack: "#7a4fc0",
  devops: "#4caf50",
  seguridad: "#b04fc8",
  qa: "#9c8cdc",
  "critico-diseno": "#c8323c",
  escritor: "#e07a3c",
}

const REEMPLAZOS = [
  ["`Read`", "`read`"],
  ["`Grep`", "`grep`"],
  ["`Glob`", "`glob`"],
  ["`Bash`", "`shell`"],
  ["`Write`", "`write`"],
  ["`Edit`", "`edit`"],
  ["`MultiEdit`", "`edit`"],
  ["`Task`", "`subagent`"],
  ["`Agent`", "`subagent`"],
  ["`SendMessage`", "`subagent`"],
  ["`AskUserQuestion`", "`question`"],
  ["`WebFetch`", "`webfetch`"],
  ["`WebSearch`", "`websearch`"],
  ["`NotebookEdit`", "`edit`"],
  ["run_in_background: true", "background: true"],
]

function separar(texto) {
  const match = texto.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/)
  if (!match) return { campos: new Map(), cuerpo: texto }

  const campos = new Map()
  for (const linea of match[1].split(/\r?\n/)) {
    const i = linea.indexOf(":")
    if (i <= 0) continue
    campos.set(linea.slice(0, i).trim(), linea.slice(i + 1).trim())
  }

  return { campos, cuerpo: texto.slice(match[0].length) }
}

function traducirCuerpo(cuerpo) {
  let salida = cuerpo
  for (const [de, a] of REEMPLAZOS) salida = salida.split(de).join(a)
  // mcp__linear-server__get_issue → linear-server_get_issue
  salida = salida.replace(/\bmcp__([A-Za-z0-9_-]+)__([A-Za-z0-9_-]+)\b/g, "$1_$2")
  return salida
}

function permisos(tools) {
  // Sin `tools`, el agente de Claude tiene acceso completo: no se restringe nada.
  if (!tools) return []

  const lista = []
  if (!/\b(Write|Edit|MultiEdit)\b/.test(tools)) {
    lista.push('  - { action: edit, resource: "*", effect: deny }')
  }
  if (!/\bBash\b/.test(tools)) {
    lista.push('  - { action: shell, resource: "*", effect: deny }')
  }
  return lista
}

mkdirSync(DESTINO, { recursive: true })

const salidas = new Map()
for (const nombre of readdirSync(ORIGEN)) {
  if (!nombre.endsWith(".md")) continue

  const rol = nombre.slice(0, -3)
  const { campos, cuerpo } = separar(readFileSync(join(ORIGEN, nombre), "utf8"))
  const modelo = MODELOS[campos.get("model") ?? ""]
  const color = COLORES[rol]
  const reglas = permisos(campos.get("tools"))

  const lineas = ["---"]
  if (campos.get("description")) lineas.push(`description: ${campos.get("description")}`)
  lineas.push("mode: subagent")
  if (modelo) lineas.push(`model: ${modelo}`)
  if (color) lineas.push(`color: "${color}"`)
  if (reglas.length > 0) lineas.push("permissions:", ...reglas)
  lineas.push("---", "")

  salidas.set(nombre, `${lineas.join("\n")}\n${traducirCuerpo(cuerpo)}`)
}

if (process.argv.includes("--check")) {
  const problemas = []

  for (const [nombre, contenido] of salidas) {
    const archivo = join(DESTINO, nombre)
    if (!existsSync(archivo)) problemas.push(`falta ${nombre}`)
    else if (readFileSync(archivo, "utf8") !== contenido) problemas.push(`desactualizado ${nombre}`)
  }
  for (const nombre of readdirSync(DESTINO)) {
    if (nombre.endsWith(".md") && !salidas.has(nombre)) problemas.push(`sobra ${nombre}`)
  }

  if (problemas.length > 0) {
    console.error("[equipo-dbs] Agentes de OpenCode desincronizados:")
    for (const problema of problemas) console.error(`  - ${problema}`)
    console.error("[equipo-dbs] Corre: node opencode/scripts/generar-agentes.mjs")
    process.exit(1)
  }

  console.log("[equipo-dbs] Agentes de OpenCode sincronizados")
  process.exit(0)
}

for (const [nombre, contenido] of salidas) {
  writeFileSync(join(DESTINO, nombre), contenido, "utf8")
}

console.log(`[equipo-dbs] ${salidas.size} agentes de OpenCode generados en ${DESTINO}`)
