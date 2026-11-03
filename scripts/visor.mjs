#!/usr/bin/env node
// Mapa del equipo: sirve visor/index.html y transmite por SSE los eventos que anota hooks/evento.sh.
// Uso: node scripts/visor.mjs [puerto]   (por defecto 4321; solo escucha en 127.0.0.1)
import { createServer } from 'node:http'
import { closeSync, existsSync, mkdirSync, openSync, readFileSync, readSync, statSync, watch, writeFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { AVATARES } from '../hooks/avatares.ts'
import { EQUIPO, transformacionDe } from '../hooks/equipo.ts'

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..')
const puerto = Number(process.argv[2] ?? 4321)
const archivo = join(homedir(), '.claude', 'equipo-dbs', 'eventos.jsonl')
mkdirSync(dirname(archivo), { recursive: true })
if (!existsSync(archivo)) writeFileSync(archivo, '')

/** Agrega al evento crudo del hook lo que el navegador no sabe calcular: transformación y frase. */
function enriquecer(linea) {
  let e
  try { e = JSON.parse(linea) } catch { return null }
  const p = EQUIPO[e.rol]
  if (!p) return null
  if (e.tipo === 'inicio') {
    e.transformacion = transformacionDe(p.base, e.model, e.effort) ?? null
    e.frase = p.trabajando.find(([re]) => re.test(e.tarea))?.[1] ?? p.porDefecto
  } else {
    e.frase = e.bloqueo ? p.falla : p.listo
  }
  return e
}

const equipo = Object.fromEntries(Object.entries(EQUIPO).map(([rol, p]) => [rol, { nombre: p.nombre, color: p.color, avatar: AVATARES[rol] }]))
equipo.lider = { nombre: 'Hit', color: '#9b6fd0', avatar: AVATARES.lider }

const clientes = new Set()
let leido = statSync(archivo).size
let resto = ''
// Se vigila la carpeta: el recorte del hook reemplaza el archivo (mv) y un watch sobre él se perdería.
watch(dirname(archivo), (_, nombre) => {
  if (nombre !== 'eventos.jsonl' || !existsSync(archivo)) return
  const tam = statSync(archivo).size
  if (tam < leido) leido = 0 // el hook recortó el archivo
  if (tam === leido) return
  const buf = Buffer.alloc(tam - leido)
  const fd = openSync(archivo, 'r')
  readSync(fd, buf, 0, buf.length, leido)
  closeSync(fd)
  leido = tam
  const lineas = (resto + buf.toString('utf8')).split('\n')
  resto = lineas.pop() ?? ''
  for (const e of lineas.map(enriquecer).filter(Boolean)) {
    for (const res of clientes) res.write(`data: ${JSON.stringify(e)}\n\n`)
  }
})

createServer((req, res) => {
  if (req.url === '/eventos') {
    res.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache' })
    // Al conectar: el historial reciente, para que el mapa arranque con el estado real.
    const previos = readFileSync(archivo, 'utf8').split('\n').slice(-300).map(enriquecer).filter(Boolean)
    res.write(`event: inicio\ndata: ${JSON.stringify({ equipo, eventos: previos })}\n\n`)
    clientes.add(res)
    req.on('close', () => clientes.delete(res))
    return
  }
  if (req.url === '/' || req.url === '/index.html') {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Content-Security-Policy': "default-src 'self'; img-src 'self' data:; style-src 'self' 'unsafe-inline'" })
    return res.end(readFileSync(join(raiz, 'visor', 'index.html')))
  }
  // Sprites de visor/sprites (hojas PNG e índice): solo nombres simples, sin rutas.
  const sprite = req.url?.match(/^\/sprites\/([a-z-]+\.(png|json))$/)
  if (sprite && existsSync(join(raiz, 'visor', 'sprites', sprite[1]))) {
    res.writeHead(200, { 'Content-Type': sprite[2] === 'png' ? 'image/png' : 'application/json' })
    return res.end(readFileSync(join(raiz, 'visor', 'sprites', sprite[1])))
  }
  // Fondos ilustrados de visor/fondos (desierto, costa, plaza y una sala por rol).
  const fondo = req.url?.match(/^\/fondos\/([a-z-]+\.(jpg|png))$/)
  if (fondo && existsSync(join(raiz, 'visor', 'fondos', fondo[1]))) {
    res.writeHead(200, { 'Content-Type': fondo[2] === 'png' ? 'image/png' : 'image/jpeg' })
    return res.end(readFileSync(join(raiz, 'visor', 'fondos', fondo[1])))
  }
  if (req.url === '/mapa.js') {
    res.writeHead(200, { 'Content-Type': 'text/javascript; charset=utf-8' })
    return res.end(readFileSync(join(raiz, 'visor', req.url.slice(1))))
  }
  res.writeHead(404).end()
}).listen(puerto, '127.0.0.1', () => console.log(`Mapa del equipo en http://localhost:${puerto}`))
