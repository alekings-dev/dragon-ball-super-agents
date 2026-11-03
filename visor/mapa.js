// Mapa del equipo: una sala por rol, Hitto al centro y el feed «En vivo». Los datos llegan por SSE desde scripts/visor.mjs.
// Todo texto que viene de los eventos se pinta con textContent (las tareas las escribe el líder).
// Personajes: hojas de visor/sprites (scripts/importar-sprites.py), una fila por animación; si falta la hoja, el avatar 16x16.

// [rol, lugar, suelo, color de la pared, muebles [sprite, izquierda %, arriba %]]. El arte sale de scripts/generar-arte.py.
const SALAS = [
  ['producto', 'Laboratorio del Dr. Gero', 'capsula', '#cfe3ef', [['capsula', 6, 4], ['escritorio', 72, 4], ['planta', 84, 62]]],
  ['arquitecto', 'Planeta de Bills', 'bills', '#5b3d86', [['pilar', 4, 4], ['pilar', 82, 4], ['cojin', 70, 62]]],
  ['backend', 'Cámara de gravedad', 'gravedad', '#3c4150', [['consola', 6, 4], ['pesa', 76, 60], ['pesa', 8, 60]]],
  ['frontend', 'Casa de Goku', 'goku', '#8c5a32', [['estante', 6, 4], ['mesa', 74, 56], ['planta', 82, 4]]],
  ['fullstack', 'Estudio de Gohan', 'gohan', '#a8794a', [['estante', 6, 4], ['estante', 20, 4], ['escritorio', 74, 4]]],
  null,
  ['devops', 'Templo de Kami', 'kami', '#b9c3cf', [['pilar', 4, 4], ['pilar', 82, 4], ['planta', 6, 62], ['planta', 82, 62]]],
  ['seguridad', 'Nave de Freezer', 'freezer', '#2c1b45', [['ventana', 8, 4], ['ventana', 78, 4], ['consola', 74, 58]]],
  ['qa', 'Máquina del tiempo', 'tiempo', '#8c93a3', [['capsula', 74, 4], ['consola', 6, 4], ['pesa', 8, 62]]],
  ['critico-diseno', 'Mundo de Jiren', 'vados', '#9ec6e8', [['pilar', 4, 4], ['baston', 80, 8], ['planta', 82, 62]]],
  ['escritor', 'Kame House', 'kaio', '#6fb0e0', [['casita', 6, 4], ['arbol', 78, 4], ['planta', 8, 62]]],
]
// ponytail: una tarea sin entrega en 3 h se da por perdida (permiso denegado, sesión cerrada).
const VENCE_MS = 3 * 60 * 60 * 1000
const GLOBO_MS = 90 * 1000
const ESCALA = 1.5 // los sprites se ven a 1,5x; todos igual, así se mantiene la diferencia de estatura
const CUADRO_MS = 160
const VELOCIDAD = 0.35 // px por ms al caminar
const ESPERA_PLAZA_MS = 1600

let equipo = {}
let hojas = {}
const estado = {} // rol → { estado, tarea, desde, hasta, transformacion, frase, proyecto }
const feed = []
const enCamino = new Set() // roles que están caminando: pintar() no les cambia la animación

const $ = (sel, raiz = document) => raiz.querySelector(sel)
const png = b64 => (b64 ? `data:image/png;base64,${b64}` : '')
const hace = ms => {
  const s = Math.max(0, Math.round(ms / 1000))
  return s < 60 ? `${s} s` : s < 3600 ? `${Math.floor(s / 60)} min` : `${Math.floor(s / 3600)} h ${Math.floor(s / 60) % 60} min`
}
const reducido = matchMedia('(prefers-reduced-motion: reduce)').matches

/** Personaje del rol: un div con su hoja de sprites, o el avatar de 16x16 si no hay hoja. */
function crearPj(rol) {
  const hoja = hojas[rol]
  if (!hoja) {
    const img = document.createElement('img')
    img.className = 'avatar'
    img.src = png(equipo[rol]?.avatar)
    img.alt = equipo[rol]?.nombre ?? rol
    return img
  }
  const pj = document.createElement('div')
  pj.className = 'pj'
  pj.dataset.rol = rol
  pj.setAttribute('role', 'img')
  pj.setAttribute('aria-label', equipo[rol]?.nombre ?? rol)
  pj.style.width = `${hoja.w * ESCALA}px`
  pj.style.height = `${hoja.h * ESCALA}px`
  pj.style.backgroundImage = `url(/sprites/${rol}.png)`
  pj.style.backgroundSize = `${hoja.ancho * ESCALA}px auto`
  animar(pj, 'quieto')
  return pj
}

function animar(pj, animacion) {
  if (pj.dataset.anim === animacion) return
  pj.dataset.anim = animacion
  pj.dataset.cuadro = '0'
  dibujarCuadro(pj)
}

function dibujarCuadro(pj) {
  const hoja = hojas[pj.dataset.rol]
  const a = hoja?.animaciones[pj.dataset.anim]
  if (!a) return
  const i = Number(pj.dataset.cuadro) % a.cuadros
  pj.style.backgroundPosition = `${-i * hoja.w * ESCALA}px ${-a.fila * hoja.h * ESCALA}px`
}

// Un solo reloj para todos los cuadros (más barato que una animación CSS por personaje).
setInterval(() => {
  if (reducido) return
  for (const pj of document.querySelectorAll('.pj')) {
    pj.dataset.cuadro = String(Number(pj.dataset.cuadro) + 1)
    dibujarCuadro(pj)
  }
}, CUADRO_MS)

/** Animación que corresponde al estado (cuando no está caminando). */
const animacionDe = s => s?.estado === 'trabaja' ? (s.transformacion ? 'aura' : 'quieto') : s?.estado === 'falló' ? 'caida' : 'quieto'

/** Centro del pie de un elemento, en coordenadas del mapa. */
function pie(el) {
  const m = $('#mapa').getBoundingClientRect()
  const r = el.getBoundingClientRect()
  return { x: r.left - m.left + r.width / 2, y: r.bottom - m.top }
}

/** Mueve un clon del personaje de `desde` a `hasta` caminando, mirando hacia donde va. */
async function caminar(rol, desde, hasta) {
  const capa = $('#capa')
  const pj = crearPj(rol)
  pj.classList.add('viajero')
  capa.append(pj)
  const ancho = parseFloat(pj.style.width) || 72
  const alto = parseFloat(pj.style.height) || 72
  const lugar = p => `translate(${p.x - ancho / 2}px, ${p.y - alto}px)`
  animar(pj, 'camina')
  const giro = hasta.x < desde.x ? ' scaleX(-1)' : ''
  const ms = Math.max(400, Math.hypot(hasta.x - desde.x, hasta.y - desde.y) / VELOCIDAD)
  await pj.animate([{ transform: lugar(desde) + giro }, { transform: lugar(hasta) + giro }], { duration: reducido ? 1 : ms, easing: 'linear' }).finished
  pj.style.transform = lugar(hasta)
  return pj
}

/** Ida y vuelta: la sala ↔ la plaza de Hitto. `entrega` = va a entregar (sale de la sala); si no, llega con la tarea. */
async function viaje(rol, entrega, bloqueo) {
  const sala = $(`#sala-${rol}`)
  const enSala = $('.pj, .avatar', sala)
  const plaza = $('#whis .pj, #whis .avatar')
  if (!sala || !enSala || !plaza || enCamino.has(rol)) return
  enCamino.add(rol)
  enSala.style.visibility = 'hidden'
  const enPlaza = { ...pie(plaza), x: pie(plaza).x + (entrega ? 70 : -70) }
  try {
    if (entrega) {
      const v = await caminar(rol, pie(enSala), enPlaza)
      if (v.classList.contains('pj')) animar(v, bloqueo ? 'caida' : 'entrega')
      await new Promise(r => setTimeout(r, ESPERA_PLAZA_MS))
      v.remove()
      ;(await caminar(rol, enPlaza, pie(enSala))).remove()
    } else {
      ;(await caminar(rol, enPlaza, pie(enSala))).remove()
    }
  } finally {
    enCamino.delete(rol)
    enSala.style.visibility = ''
    pintar()
  }
}

function aplicar(e, enVivo = false) {
  const previo = estado[e.rol] ?? {}
  if (e.tipo === 'inicio') {
    estado[e.rol] = { estado: 'trabaja', tarea: e.tarea, desde: e.t, transformacion: e.transformacion, frase: e.frase, proyecto: e.proyecto }
  } else {
    estado[e.rol] = { ...previo, estado: e.bloqueo ? 'falló' : 'terminó', hasta: e.t, frase: e.frase }
  }
  feed.unshift(e.tipo === 'inicio'
    ? { t: e.t, rol: e.rol, de: 'Hitto', a: equipo[e.rol]?.nombre, texto: e.tarea }
    : { t: e.t, rol: e.rol, de: equipo[e.rol]?.nombre, a: 'Hitto', texto: `${e.bloqueo ? 'bloqueo en' : 'entregó'}: ${previo.tarea ?? ''}` })
  feed.length = Math.min(feed.length, 30)
  if (enVivo) void viaje(e.rol, e.tipo === 'fin', e.bloqueo)
}

function crearSalas() {
  const mapa = $('#mapa')
  const whis = $('#whis')
  $('.avatar', whis).replaceWith(crearPj('lider'))
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
      + '<div class="suelo"><div class="globo"></div></div><div class="estado"></div>'
    $('.nombre', sala).textContent = p.nombre
    $('.lugar', sala).textContent = lugar
    $('.suelo', sala).append(crearPj(rol))
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
  const capa = document.createElement('div')
  capa.id = 'capa'
  mapa.append(capa)
}

function pintar() {
  const ahora = Date.now()
  let trabajando = 0
  for (const s0 of Object.values(estado)) {
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
    const pj = $('.pj', sala)
    if (pj && !enCamino.has(rol)) animar(pj, animacionDe(s))
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
  $('#resumen').textContent = `Hitto dirige · ${trabajando === 0 ? 'todos descansando' : `${trabajando} trabajando`}`
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

async function cargarHojas() {
  try {
    const indice = await (await fetch('/sprites/indice.json')).json()
    // Ancho total de cada hoja: la fila más larga.
    for (const h of Object.values(indice)) h.ancho = h.w * Math.max(...Object.values(h.animaciones).map(a => a.cuadros))
    return indice
  } catch {
    return {} // sin sprites: quedan los avatares de 16x16
  }
}

const listo = cargarHojas().then(h => { hojas = h })
const fuente = new EventSource('/eventos')
fuente.addEventListener('inicio', async m => {
  await listo
  const datos = JSON.parse(m.data)
  if (!Object.keys(equipo).length) { equipo = datos.equipo; crearSalas() }
  for (const k of Object.keys(estado)) delete estado[k]
  feed.length = 0
  datos.eventos.forEach(e => aplicar(e))
  pintar()
})
fuente.onmessage = async m => { await listo; aplicar(JSON.parse(m.data), true); pintar() }
fuente.onerror = () => { $('#resumen').textContent = 'Sin conexión con el visor (¿sigue corriendo scripts/visor.mjs?)' }
setInterval(pintar, 5000)
