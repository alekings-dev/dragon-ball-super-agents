// Mapa del equipo: una sala por rol, Whis al centro y el feed «En vivo». Los datos llegan por SSE desde scripts/visor.mjs.
// Todo texto que viene de los eventos se pinta con textContent (las tareas las escribe el líder).

// [rol, lugar, suelo, color de la pared, muebles [sprite, izquierda %, arriba %]]. El arte sale de scripts/generar-arte.py.
const SALAS = [
  ['producto', 'Capsule Corp', 'capsula', '#cfe3ef', [['capsula', 6, 4], ['escritorio', 72, 4], ['planta', 84, 62]]],
  ['arquitecto', 'Planeta de Bills', 'bills', '#5b3d86', [['pilar', 4, 4], ['pilar', 82, 4], ['cojin', 70, 62]]],
  ['backend', 'Cámara de gravedad', 'gravedad', '#3c4150', [['consola', 6, 4], ['pesa', 76, 60], ['pesa', 8, 60]]],
  ['frontend', 'Casa de Goku', 'goku', '#8c5a32', [['estante', 6, 4], ['mesa', 74, 56], ['planta', 82, 4]]],
  ['fullstack', 'Estudio de Gohan', 'gohan', '#a8794a', [['estante', 6, 4], ['estante', 20, 4], ['escritorio', 74, 4]]],
  null,
  ['devops', 'Templo de Kami', 'kami', '#b9c3cf', [['pilar', 4, 4], ['pilar', 82, 4], ['planta', 6, 62], ['planta', 82, 62]]],
  ['seguridad', 'Nave de Freezer', 'freezer', '#2c1b45', [['ventana', 8, 4], ['ventana', 78, 4], ['consola', 74, 58]]],
  ['qa', 'Máquina del tiempo', 'tiempo', '#8c93a3', [['capsula', 74, 4], ['consola', 6, 4], ['pesa', 8, 62]]],
  ['critico-diseno', 'Palacio de Vados', 'vados', '#9ec6e8', [['pilar', 4, 4], ['baston', 80, 8], ['planta', 82, 62]]],
  ['escritor', 'Planeta Kaio', 'kaio', '#6fb0e0', [['casita', 6, 4], ['arbol', 78, 4], ['planta', 8, 62]]],
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
  $('.fuente', whis).src = ARTE.fuente
  $('.isla .casita').src = ARTE.casita
  for (const img of document.querySelectorAll('.isla .palmera')) img.src = ARTE.palmera
  document.body.style.setProperty('--arena', `url(${ARTE['suelo-arena']})`)
  document.body.style.setProperty('--agua', `url(${ARTE['suelo-agua']})`)
  // Rocas sueltas por la arena, en posiciones fijas para que no salten al recargar.
  for (const [x, y] of [[1, 34], [24.5, 2], [49, 96], [73.5, 66], [24, 66], [49, 32]]) {
    const roca = document.createElement('img')
    roca.className = 'roca'
    roca.src = ARTE.roca
    roca.alt = ''
    roca.style.left = `${x}%`
    roca.style.top = `${y}%`
    mapa.append(roca)
  }
  for (const celda of SALAS) {
    if (!celda) { mapa.append(whis); continue }
    const [rol, lugar, suelo, pared, muebles] = celda
    const p = equipo[rol]
    const sala = document.createElement('section')
    sala.className = 'sala'
    sala.id = `sala-${rol}`
    sala.style.setProperty('--color', p.color)
    sala.style.setProperty('--suelo', `url(${ARTE[`suelo-${suelo}`]})`)
    sala.style.setProperty('--pared', pared)
    sala.innerHTML = '<header><span class="punto"></span><span class="nombre"></span><small class="lugar"></small></header>'
      + '<div class="suelo"><div class="globo"></div><img class="avatar"></div><div class="estado"></div>'
    $('.nombre', sala).textContent = p.nombre
    $('.lugar', sala).textContent = lugar
    $('.avatar', sala).src = png(p.avatar)
    $('.avatar', sala).alt = p.nombre
    for (const [sprite, x, y] of muebles) {
      const img = document.createElement('img')
      img.className = 'mueble'
      img.src = ARTE[sprite]
      img.alt = ''
      img.style.left = `${x}%`
      img.style.top = `${y}%`
      $('.suelo', sala).append(img)
    }
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
