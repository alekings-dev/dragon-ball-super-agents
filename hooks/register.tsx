import { atom, read, update } from 'claude-code'
import type { Register } from 'claude-code'

import type { Miembro, Transformacion } from '../types'
import { AVATARES } from './avatares'
import { EQUIPO, transformacionDe, type Personaje } from './equipo'

const PANE = 'equipo-dbs'
const miembros = atom({ plugin: 'equipo-dbs', key: 'miembros' } as const, [])
const transformaciones = atom({ plugin: 'equipo-dbs', key: 'transformaciones' } as const, {})

const COLOR_AURA: Record<Transformacion, string> = { SSJ: '#f2c230', 'SSJ Blue': '#3fb6f0' }

const estadoDe = (status: string): Miembro['estado'] =>
  status === 'completed' || status === 'idle' ? 'terminó' : status === 'failed' || status === 'killed' ? 'falló' : 'trabaja'

/** Quita el nombre del personaje si la tarea empieza con él («Piccolo integra PR 156» → «integra PR 156»). */
const sinNombre = (tarea: string, nombre: string) => tarea.replace(new RegExp(`^${nombre}\\s*:?\\s*`, 'i'), '')

const frase = (p: Personaje, m: Miembro) =>
  m.estado === 'terminó' ? p.listo : m.estado === 'falló' ? p.falla : p.trabajando.find(([re]) => re.test(m.tarea))?.[1] ?? p.porDefecto

const duracion = (ms: number) => {
  const min = Math.floor(ms / 60000)
  return min < 1 ? `${Math.max(1, Math.round(ms / 1000))} s` : min < 60 ? `${min} min` : `${Math.floor(min / 60)} h ${min % 60} min`
}

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    await $.command.register({ name: 'equipo', description: 'Muestra el panel del equipo de agentes (Dragon Ball Super)' })
    void $.ui.open({ id: PANE, title: 'Equipo' })

    // Cada 3 s, toma la foto de los agentes del equipo y la guarda (los terminados quedan como historial).
    $.clock.every(3000, () => {
      void (async () => {
        const lista = await $.agent.list()
        const ahora = await $.clock.now()
        await update($, miembros, previos => {
          const porId = new Map(previos.map(m => [m.id, m]))
          for (const a of lista) {
            const tipo = a.type.replace(/^equipo-dbs:/, '')
            if (!EQUIPO[tipo]) continue
            const previo = porId.get(a.id)
            const estado = estadoDe(a.status)
            const hasta = estado === 'trabaja' ? undefined : previo?.hasta ?? ahora
            porId.set(a.id, { id: a.id, tipo, tarea: a.description, estado, desde: previo?.desde ?? ahora, hasta })
          }
          return [...porId.values()].sort((x, y) => y.desde - x.desde).slice(0, 40)
        })
      })()
    })

    return next(e)
  })

  // Anota la transformación con que Whis lanza a cada especialista (model / effort de la llamada a Agent).
  on('tool.call', { tool: 'Agent' }, async ($, e, next) => {
    const p = EQUIPO[(e.subagent_type ?? '').replace(/^equipo-dbs:/, '')]
    const t = p && transformacionDe(p.base, e.model, e.effort)
    if (t) await update($, transformaciones, previas => ({ ...previas, [e.description]: t }))
    return next(e)
  })

  on('command.run', { command: 'equipo' }, async $ => {
    await $.ui.open({ id: PANE, title: 'Equipo' })
    return { text: 'Panel del equipo abierto.' }
  })

  on('ui.render', { component: 'Pane', requestId: PANE }, async ($, e) => {
    const ui = $.ui.resolve(e)
    const { Box, Text } = ui
    // `Image` solo existe en la terminal; en otras superficies queda la carita.
    const Image = 'Image' in ui ? ui.Image : undefined
    const lista = await read($, miembros)
    const auras = await read($, transformaciones)
    const ahora = await $.clock.now()
    const trabajando = lista.filter(m => m.estado === 'trabaja')
    const listos = lista.filter(m => m.estado !== 'trabaja')
    const espacio = Math.max(1, (e.viewport?.rows ?? 24) - 6 - trabajando.length * 2)
    const personaje = (m: Miembro): Personaje =>
      EQUIPO[m.tipo] ?? { nombre: m.tipo, cara: '(・・)', color: '#999999', base: 'sonnet', trabajando: [], porDefecto: '', listo: '', falla: '' }
    const aura = (m: Miembro) => {
      const t = auras[m.tarea]
      return t ? <Text color={COLOR_AURA[t]} bold> ⚡{t}</Text> : null
    }
    // El avatar solo existe en la terminal (Image); en otras superficies queda la carita.
    const avatar = (m: Miembro, p: Personaje) => {
      const png = AVATARES[m.tipo]
      return Image && png
        ? <Image key={m.id} source={{ png }} columns={4} rows={2} alt={p.cara} />
        : <Text color={p.color}>{p.cara}</Text>
    }

    const enCurso = (m: Miembro) => {
      const p = personaje(m)
      return (
        <Box flexDirection="row" gap={1}>
          {avatar(m, p)}
          <Box flexDirection="column">
            <Text>
              <Text color={p.color} bold>{p.nombre}</Text>
              {aura(m)}
              <Text> {sinNombre(m.tarea, p.nombre)} </Text>
              <Text dimColor>· {duracion(ahora - m.desde)}</Text>
            </Text>
            <Text color={p.color} italic>«{frase(p, m)}»</Text>
          </Box>
        </Box>
      )
    }

    const terminado = (m: Miembro) => {
      const p = personaje(m)
      const fallo = m.estado === 'falló'
      return (
        <Text>
          <Text color={p.color}>{p.cara} {p.nombre}</Text>
          {aura(m)}
          <Text color={fallo ? 'red' : 'green'}> {fallo ? '✗' : '✓'} </Text>
          <Text dimColor>{sinNombre(m.tarea, p.nombre)} · {duracion((m.hasta ?? ahora) - m.desde)} · «{frase(p, m)}»</Text>
        </Text>
      )
    }

    return (
      <Box flexDirection="column">
        <Box flexDirection="row" gap={1}>
          {Image && AVATARES.whis ? <Image key="whis" source={{ png: AVATARES.whis }} columns={4} rows={2} alt="(◕‿◕)" /> : null}
          <Text>
            <Text bold color="#c8c8dc">(◕‿◕) Whis dirige</Text>
            <Text dimColor> · {trabajando.length === 0 ? 'todos descansando' : `${trabajando.length} trabajando`}</Text>
          </Text>
        </Box>
        <Text bold>Trabajando</Text>
        {trabajando.length === 0 ? <Text dimColor>Nadie en este momento.</Text> : trabajando.map(enCurso)}
        <Text bold>Terminaron</Text>
        {listos.length === 0 ? <Text dimColor>Todavía nadie.</Text> : listos.slice(0, espacio).map(terminado)}
      </Box>
    )
  })
}
