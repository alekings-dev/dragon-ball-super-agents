/** @jsxImportSource @opentui/solid */
import { Plugin, usePlugin } from "@opencode/plugin/tui"
import { For, Show, createMemo, createSignal, onCleanup, onMount } from "solid-js"

import { EQUIPO } from "../../hooks/equipo.ts"

const PANEL = "equipo-dbs.equipo"

type Fila = {
  id: string
  rol: string
  nombre: string
  cara: string
  color: string
  tarea: string
  estado: "trabaja" | "terminó" | "falló"
  desde: number
}

const duracion = (ms: number): string => {
  const segundos = Math.max(1, Math.round(ms / 1000))
  if (segundos < 60) return `${segundos} s`
  const minutos = Math.floor(segundos / 60)
  return minutos < 60 ? `${minutos} min` : `${Math.floor(minutos / 60)} h ${minutos % 60} min`
}

const rolDe = (agente: string | undefined): string | undefined => {
  if (!agente) return undefined
  const rol = agente.replace(/^equipo-dbs[:/]/, "")
  return rol in EQUIPO ? rol : undefined
}

function Panel(props: { sessionID: string }) {
  const ctx = usePlugin()
  const [ahora, setAhora] = createSignal(Date.now())

  onMount(() => {
    void ctx.data.session.sync(props.sessionID)

    // Cuando nace un subagente, carga su sesión para que el panel lo vea.
    const quitarEvento = ctx.data.on("session.created", (evento) => {
      if (evento.data.parentID === props.sessionID) void ctx.data.session.sync(evento.data.sessionID)
    })
    onCleanup(quitarEvento)

    const reloj = setInterval(() => setAhora(Date.now()), 1000)
    onCleanup(() => clearInterval(reloj))
  })

  const filas = createMemo<Fila[]>(() => {
    const t = ahora()
    const lista: Fila[] = []

    for (const id of ctx.data.session.family(props.sessionID)) {
      if (id === props.sessionID) continue
      const sesion = ctx.data.session.get(id)
      if (!sesion || sesion.parentID !== props.sessionID) continue

      const rol = rolDe(sesion.agent)
      if (!rol) continue

      const personaje = EQUIPO[rol]
      if (!personaje) continue

      const viva = ctx.data.session.status(id) === "running"
      const estado: Fila["estado"] =
        sesion.outcome === "failed" ? "falló" : viva ? "trabaja" : "terminó"

      lista.push({
        id,
        rol,
        nombre: personaje.nombre,
        cara: personaje.cara,
        color: personaje.color,
        tarea: sesion.title ?? "",
        estado,
        desde: sesion.time?.created ?? t,
      })
    }

    return lista.sort((a, b) => b.desde - a.desde)
  })

  const trabajando = createMemo(() => filas().filter((fila) => fila.estado === "trabaja"))
  const terminaron = createMemo(() => filas().filter((fila) => fila.estado !== "trabaja"))

  return (
    <box flexDirection="column" padding={1}>
      <box flexDirection="row" gap={1}>
        <text fg="#c8c8dc">(⌐■_■) Hit dirige</text>
        <text fg="#8a8a9a">
          {trabajando().length === 0 ? "· todos descansando" : `· ${trabajando().length} trabajando`}
        </text>
      </box>

      <text fg="#c8c8dc">Trabajando</text>
      <Show
        when={trabajando().length > 0}
        fallback={<text fg="#7a7a8a">Nadie en este momento.</text>}
      >
        <For each={trabajando()}>
          {(fila) => (
            <box flexDirection="row" gap={1}>
              <text fg={fila.color}>{`${fila.cara} ${fila.nombre}`}</text>
              <text fg="#d0d0d0">{fila.tarea || "en su sala"}</text>
              <text fg="#7a7a8a">{`· ${duracion(ahora() - fila.desde)}`}</text>
            </box>
          )}
        </For>
      </Show>

      <text fg="#c8c8dc">Terminaron</text>
      <Show
        when={terminaron().length > 0}
        fallback={<text fg="#7a7a8a">Todavía nadie.</text>}
      >
        <For each={terminaron().slice(0, 20)}>
          {(fila) => (
            <box flexDirection="row" gap={1}>
              <text fg={fila.color}>{`${fila.cara} ${fila.nombre}`}</text>
              <text fg={fila.estado === "falló" ? "#d05050" : "#50b060"}>
                {fila.estado === "falló" ? "✗" : "✓"}
              </text>
              <text fg="#8a8a9a">
                {`${fila.tarea || "sin descripción"} · ${duracion(ahora() - fila.desde)}`}
              </text>
            </box>
          )}
        </For>
      </Show>
    </box>
  )
}

export default Plugin.define({
  id: "equipo-dbs.tui",
  setup(context) {
    context.keymap.layer(() => ({
      mode: "global",
      priority: 10,
      commands: [
        {
          id: "equipo-dbs.panel",
          title: "Panel del equipo (Dragon Ball)",
          description: "Quién trabaja, en qué y cuánto lleva",
          group: "Equipo DBS",
          palette: true,
          slash: { name: "equipo" },
          run: () => {
            context.ui.panel.open(PANEL)
          },
        },
      ],
    }))

    const quitarSlot = context.ui.slot({
      append: "session.panel",
      render: (panel) => (
        <Show when={panel.name === PANEL} fallback={<></>}>
          <Panel sessionID={panel.sessionID} />
        </Show>
      ),
    })

    return () => quitarSlot()
  },
})
