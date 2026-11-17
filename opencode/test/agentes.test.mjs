import assert from "node:assert/strict"
import { execFileSync } from "node:child_process"
import { join } from "node:path"
import test from "node:test"
import { fileURLToPath } from "node:url"

const RAIZ = fileURLToPath(new URL("../..", import.meta.url))

test("los agentes de OpenCode están sincronizados con agents/", () => {
  const salida = execFileSync(process.execPath, [join(RAIZ, "opencode", "scripts", "generar-agentes.mjs"), "--check"], {
    encoding: "utf8",
  })
  assert.match(salida, /sincronizados/)
})
