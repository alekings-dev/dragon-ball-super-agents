import assert from "node:assert/strict"
import test from "node:test"

import {
  normalizarModelo,
  parsearSkill,
  rolDeAgente,
  tieneBloqueo,
  ultimoTexto,
} from "../src/util.ts"

test("rolDeAgente acepta los tres prefijos y rechaza agentes ajenos", () => {
  assert.equal(rolDeAgente("equipo-dbs:backend"), "backend")
  assert.equal(rolDeAgente("equipo-dbs/backend"), "backend")
  assert.equal(rolDeAgente("backend"), "backend")
  assert.equal(rolDeAgente("build"), undefined)
  assert.equal(rolDeAgente(undefined), undefined)
})

test("normalizarModelo entiende provider/modelo#variante", () => {
  assert.deepEqual(normalizarModelo("opencode/claude-opus-5-5#high"), {
    id: "claude-opus-5-5",
    variant: "high",
    model: "opus",
    effort: "high",
  })
  assert.deepEqual(normalizarModelo("anthropic/claude-sonnet-5-5"), {
    id: "claude-sonnet-5-5",
    variant: undefined,
    model: "claude-sonnet-5-5",
    effort: undefined,
  })
})

test("normalizarModelo entiende el objeto del tool subagent", () => {
  assert.deepEqual(normalizarModelo({ providerID: "opencode", id: "claude-opus-5-5", variant: "max" }), {
    id: "claude-opus-5-5",
    variant: "max",
    model: "opus",
    effort: "high",
  })
  assert.deepEqual(normalizarModelo(undefined), {})
})

test("parsearSkill separa frontmatter y cuerpo", () => {
  const skill = parsearSkill("---\nname: mapa\ndescription: Abre el mapa\n---\n\n# Mapa\n")
  assert.equal(skill.name, "mapa")
  assert.equal(skill.description, "Abre el mapa")
  assert.equal(skill.content.trim(), "# Mapa")
})

test("ultimoTexto usa solo el texto del último mensaje del asistente", () => {
  const mensajes = [
    { type: "user", id: "u1", content: [{ type: "text", text: "hola" }] },
    {
      type: "assistant",
      id: "a1",
      content: [
        { type: "reasoning", text: "pensando" },
        { type: "tool" },
        { type: "text", text: "primera" },
      ],
    },
    { type: "assistant", id: "a2", content: [{ type: "text", text: "segunda" }, { type: "text", text: "parte" }] },
  ]
  assert.deepEqual(ultimoTexto(mensajes), { id: "a2", texto: "segunda\nparte" })
})

test("tieneBloqueo replica el criterio de los hooks", () => {
  assert.equal(tieneBloqueo("**Bloquea**: falta autorización"), true)
  assert.equal(tieneBloqueo("Regresión e2e: 24 pasan, 2 fallan (nuevos: 1)"), true)
  assert.equal(tieneBloqueo("No integré por conflictos"), true)
  assert.equal(tieneBloqueo("Todo en verde"), false)
})
