// Mapa del equipo: una sala por rol, Whis al centro y el feed «En vivo». Los datos llegan por SSE desde scripts/visor.mjs.
// Todo texto que viene de los eventos se pinta con textContent (las tareas las escribe el líder).

const SALAS = [
  ['producto', 'Capsule Corp'], ['arquitecto', 'Planeta de Bills'], ['backend', 'Cámara de gravedad'], ['frontend', 'Casa de Goku'],
  ['fullstack', 'Estudio de Gohan'], null, ['devops', 'Templo de Kami'],
  ['seguridad', 'Nave de Freezer'], ['qa', 'Máquina del tiempo'], ['critico-diseno', 'Palacio de Vados'], ['escritor', 'Planeta Kaio'],
]
// ponytail: una tarea sin entrega en 3 h se da por perdida (permiso denegado, sesión cerrada).
const VENCE_MS = 3 * 60 * 60 * 1000
const GLOBO_MS = 90 * 1000

let equipo = {}
const estado = {} // rol → { estado, tarea, desde, hasta, transformacion, frase, proyecto }
const feed = []

const $ = (sel, raiz = document) => raiz.querySelector(sel)
const png = b64 => (b64 ? `data:image/png;base64,${b64}` : '')
const hace = ms => {
  const s = Math.max(0, Math.round(ms / 1000))
  return s < 60 ? `${s} s` : s < 3600 ? `${Math.floor(s / 60)} min` : `${Math.floor(s / 3600)} h ${Math.floor(s / 60) % 60} min`
}

function aplicar(e) {
  const previo = estado[e.rol] ?? {}
  if (e.tipo === 'inicio') {
    estado[e.rol] = { estado: 'trabaja', tarea: e.tarea, desde: e.t, transformacion: e.transformacion, frase: e.frase, proyecto: e.proyecto }
  } else {
    estado[e.rol] = { ...previo, estado: e.bloqueo ? 'falló' : 'terminó', hasta: e.t, frase: e.frase }
  }
  feed.unshift(e.tipo === 'inicio'
    ? { t: e.t, rol: e.rol, de: 'Whis', a: equipo[e.rol]?.nombre, texto: e.tarea }
    : { t: e.t, rol: e.rol, de: equipo[e.rol]?.nombre, a: 'Whis', texto: `${e.bloqueo ? 'bloqueo en' : 'entregó'}: ${previo.tarea ?? ''}` })
  feed.length = Math.min(feed.length, 30)
}

function crearSalas() {
  const mapa = $('#mapa')
  const whis = $('#whis')
  $('.avatar', whis).src = png(equipo.whis?.avatar)
  for (const celda of SALAS) {
    if (!celda) { mapa.append(whis); continue }
    const [rol, lugar] = celda
    const p = equipo[rol]
    const sala = document.createElement('section')
    sala.className = 'sala'
    sala.id = `sala-${rol}`
    sala.style.setProperty('--color', p.color)
    sala.innerHTML = '<header><span class="punto"></span><span class="nombre"></span><small class="lugar"></small></header>'
      + '<div class="suelo"><div class="globo"></div><img class="avatar"></div><div class="estado"></div>'
    $('.nombre', sala).textContent = p.nombre
    $('.lugar', sala).textContent = lugar
    $('.avatar', sala).src = png(p.avatar)
    $('.avatar', sala).alt = p.nombre
    mapa.append(sala)
  }
}

function pintar() {
  const ahora = Date.now()
  let trabajando = 0
  for (const [rol, s0] of Object.entries(estado)) {
    if (s0.estado === 'trabaja' && ahora - s0.desde > VENCE_MS) s0.estado = 'libre'
  }
  for (const celda of SALAS) {
    if (!celda) continue
    const [rol] = celda
    const sala = $(`#sala-${rol}`)
    const s = estado[rol] ?? { estado: 'libre' }
    if (s.estado === 'trabaja') trabajando++
    sala.dataset.estado = s.estado
    sala.dataset.aura = s.estado === 'trabaja' ? s.transformacion ?? '' : ''
    const reciente = s.estado === 'trabaja' || (s.hasta && ahora - s.hasta < GLOBO_MS)
    $('.globo', sala).textContent = reciente ? s.frase ?? '' : ''
    const info = $('.estado', sala)
    info.replaceChildren()
    if (s.estado === 'libre' || !s.tarea) { info.textContent = 'Libre'; continue }
    const titulo = document.createElement('b')
    titulo.textContent = s.estado === 'trabaja' ? `Trabajando · ${hace(ahora - s.desde)}` : s.estado === 'falló' ? '✗ Bloqueo' : `✓ Terminó en ${hace((s.hasta ?? ahora) - s.desde)}`
    if (s.estado === 'trabaja' && s.transformacion) {
      const aura = document.createElement('span')
      aura.className = 'ssj'
      aura.style.color = s.transformacion === 'SSJ' ? '#b88a00' : '#1b7fb5'
      aura.textContent = ` ⚡${s.transformacion}`
      titulo.append(aura)
    }
    info.append(titulo, document.createElement('br'), `${s.tarea}${s.proyecto ? ` · ${s.proyecto}` : ''}`)
  }
  $('#resumen').textContent = `Whis dirige · ${trabajando === 0 ? 'todos descansando' : `${trabajando} trabajando`}`
  const lista = $('#feed')
  lista.replaceChildren(...feed.map(f => {
    const li = document.createElement('li')
    li.style.setProperty('--color', equipo[f.rol]?.color)
    const hora = document.createElement('time')
    hora.textContent = `hace ${hace(ahora - f.t)}`
    const quien = document.createElement('strong')
    quien.textContent = `${f.de} → ${f.a}`
    const texto = document.createElement('span')
    texto.textContent = f.texto
    li.append(hora, quien, texto)
    return li
  }))
}

const fuente = new EventSource('/eventos')
fuente.addEventListener('inicio', m => {
  const datos = JSON.parse(m.data)
  if (!Object.keys(equipo).length) { equipo = datos.equipo; crearSalas() }
  for (const k of Object.keys(estado)) delete estado[k]
  feed.length = 0
  datos.eventos.forEach(aplicar)
  pintar()
})
fuente.onmessage = m => { aplicar(JSON.parse(m.data)); pintar() }
fuente.onerror = () => { $('#resumen').textContent = 'Sin conexión con el visor (¿sigue corriendo scripts/visor.mjs?)' }
setInterval(pintar, 5000)
