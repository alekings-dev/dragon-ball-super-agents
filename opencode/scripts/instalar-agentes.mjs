#!/usr/bin/env node
// Instala los agentes de OpenCode en la configuración global o en un proyecto.
// Uso:
//   node opencode/scripts/instalar-agentes.mjs --global
//   node opencode/scripts/instalar-agentes.mjs --project /ruta/al/repo
//   node opencode/scripts/instalar-agentes.mjs --global --force
import { copyFileSync, existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs"
import { homedir } from "node:os"
import { join } from "node:path"
import { fileURLToPath } from "node:url"

const RAIZ = fileURLToPath(new URL("../..", import.meta.url))
const ORIGEN = join(RAIZ, "opencode", "agentes", "equipo-dbs")

const args = process.argv.slice(2)
const forzar = args.includes("--force")
const indiceProyecto = args.indexOf("--project")
const proyecto = indiceProyecto >= 0 ? args[indiceProyecto + 1] : undefined

if (indiceProyecto >= 0 && !proyecto) {
  console.error("Falta la ruta después de --project")
  process.exit(1)
}

const base = process.env.XDG_CONFIG_HOME || join(homedir(), ".config")
const destino = proyecto
  ? join(proyecto, ".opencode", "agents", "equipo-dbs")
  : join(base, "opencode", "agents", "equipo-dbs")

if (!existsSync(ORIGEN)) {
  console.error(`No existen los agentes generados en ${ORIGEN}. Corre generar-agentes.mjs primero.`)
  process.exit(1)
}

mkdirSync(destino, { recursive: true })

let instalados = 0
let conservados = 0
for (const nombre of readdirSync(ORIGEN)) {
  if (!nombre.endsWith(".md")) continue

  const archivo = join(destino, nombre)
  if (!forzar && existsSync(archivo)) {
    if (readFileSync(archivo, "utf8") === readFileSync(join(ORIGEN, nombre), "utf8")) continue
    conservados++
    continue
  }

  if (forzar) copyFileSync(join(ORIGEN, nombre), archivo)
  else writeFileSync(archivo, readFileSync(join(ORIGEN, nombre), "utf8"), { flag: "wx" })
  instalados++
}

console.log(`[equipo-dbs] Agentes en ${destino}`)
console.log(`[equipo-dbs] ${instalados} instalados${conservados > 0 ? `, ${conservados} conservados (usa --force para actualizarlos)` : ""}`)
