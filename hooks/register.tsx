import { atom, read, update } from 'claude-code'
import type { Register } from 'claude-code'

import type { Miembro } from '../types'

const PANE = 'equipo-dbs'
const miembros = atom({ plugin: 'equipo-dbs', key: 'miembros' } as const, [])

// Rol (identificador del agente en .claude/agents/) → personaje y carita.
const EQUIPO: Record<string, { nombre: string; cara: string }> = {
  producto: { nombre: 'Bulma', cara: '(＾▽＾)' },
  arquitecto: { nombre: 'Bills', cara: '(￣ー￣)' },
  backend: { nombre: 'Vegeta', cara: '(¬_¬)' },
  frontend: { nombre: 'Goku', cara: '(ง •̀_•́)ง' },
  fullstack: { nombre: 'Gohan', cara: '(・_・)ゞ' },
  devops: { nombre: 'Piccolo', cara: '(-_-)' },
  seguridad: { nombre: 'Freezer', cara: '(¬‿¬)' },
  qa: { nombre: 'Trunks', cara: '(•̀ᴗ•́)و' },
  'critico-diseno': { nombre: 'Vados', cara: '(◠‿◠)' },
  escritor: { nombre: 'Kaio-sama', cara: '(^o^)/' },
}

const estadoDe = (status: string): Miembro['estado'] =>
  status === 'completed' || status === 'idle' ? 'terminó' : status === 'failed' || status === 'killed' ? 'falló' : 'trabaja'

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
            if (!EQUIPO[a.type]) continue
            const previo = porId.get(a.id)
            porId.set(a.id, { id: a.id, tipo: a.type, tarea: a.description, estado: estadoDe(a.status), desde: previo?.desde ?? ahora })
          }
          return [...porId.values()].sort((x, y) => y.desde - x.desde).slice(0, 40)
        })
      })()
    })

    return next(e)
  })

  on('command.run', { command: 'equipo' }, async $ => {
    await $.ui.open({ id: PANE, title: 'Equipo' })
    return { text: 'Panel del equipo abierto.' }
  })

  on('ui.render', { component: 'Pane', requestId: PANE }, async ($, e) => {
    const { Box, Text } = $.ui.resolve(e)
    const lista = await read($, miembros)
    const trabajando = lista.filter(m => m.estado === 'trabaja')
    const listos = lista.filter(m => m.estado !== 'trabaja')
    const espacio = Math.max(1, (e.viewport?.rows ?? 24) - 6 - trabajando.length)
    const fila = (m: Miembro) => {
      const p = EQUIPO[m.tipo] ?? { nombre: m.tipo, cara: '(・・)' }
      return (
        <Text dimColor={m.estado !== 'trabaja'} color={m.estado === 'falló' ? 'red' : undefined}>
          {p.cara} {p.nombre}: {m.tarea}{m.estado === 'falló' ? ' (falló)' : ''}
        </Text>
      )
    }

    return (
      <Box flexDirection="column">
        <Text bold>(◕‿◕) Whis dirige</Text>
        <Text bold>Trabajando</Text>
        {trabajando.length === 0 ? <Text dimColor>Nadie en este momento.</Text> : trabajando.map(fila)}
        <Text bold>Terminaron</Text>
        {listos.length === 0 ? <Text dimColor>Todavía nadie.</Text> : listos.slice(0, espacio).map(fila)}
      </Box>
    )
  })
}
