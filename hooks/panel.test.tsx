import { expect, test } from 'claude-code/testing'

const PANE = {
  plugin: 'equipo-dbs',
  component: 'Pane',
  requestId: 'equipo-dbs',
  props: { title: 'Equipo', isFocused: false, bodyColumns: 80, placement: 'dock', scroll: { offset: 0, bodyRows: 30 }, view: {} },
} as const

const AHORA = Date.now()
const MIEMBROS = [
  { id: 'a1', tipo: 'frontend', tarea: 'Goku: aviso vacío sobre el mapa', estado: 'trabaja', desde: AHORA - 3 * 60000 },
  { id: 'a2', tipo: 'devops', tarea: 'Piccolo integra PR 156', estado: 'terminó', desde: AHORA - 120000, hasta: AHORA - 60000 },
  { id: 'a3', tipo: 'qa', tarea: 'Trunks verifica ALE-82', estado: 'falló', desde: AHORA - 120000, hasta: AHORA },
]

test('el panel muestra frase, transformación, tiempo y estado, en la terminal y en el escritorio', async ($, on) => {
  on('clock.now', () => ({ value: AHORA }))
  on('state.get', (_, e) => ({
    value: { value: e.key === 'miembros' ? MIEMBROS : { 'Goku: aviso vacío sobre el mapa': 'SSJ' }, version: 1 },
  }))

  for (const surface of ['terminal', 'desktop'] as const) {
    const ui = await $.ui.mount({ ...PANE, surface })
    expect((await ui.find({ type: 'Text', text: /Hitto dirige · 1 trabajando/ }))).toBeTruthy()
    expect((await ui.find({ type: 'Text', text: /⚡SSJ/ }))).toBeTruthy()
    // Sin el nombre repetido y con el tiempo.
    expect((await ui.find({ type: 'Text', text: /Goku ⚡SSJ aviso vacío sobre el mapa · 3 min/ }))).toBeTruthy()
    expect((await ui.find({ type: 'Text', text: /¡Esto se pone bueno!/ }))).toBeTruthy()
    expect((await ui.find({ type: 'Text', text: /Piccolo ✓ integra PR 156 · 1 min · «El fuerte está a salvo.»/ }))).toBeTruthy()
    expect((await ui.find({ type: 'Text', text: /Trunks ✗ .*Vi el futuro/ }))).toBeTruthy()
    await ui.unmount()
  }
})
