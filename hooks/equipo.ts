import type { Transformacion } from '../types'

/** Personajes del equipo: lo comparten el panel (register.tsx) y el mapa (scripts/visor.mjs). */
export type Personaje = {
  nombre: string
  cara: string
  color: string
  /** Modelo base del agente (frontmatter): Opus ya no sube a SSJ, solo a SSJ Blue. */
  base: 'opus' | 'sonnet' | 'haiku'
  /** Frase mientras trabaja, según lo que hace (primer patrón que calce con la tarea). */
  trabajando: [RegExp, string][]
  porDefecto: string
  listo: string
  falla: string
}

// Rol (agente del plugin en agents/, sin el prefijo equipo-dbs:) → personaje.
export const EQUIPO: Record<string, Personaje> = {
  producto: {
    nombre: 'Androide 18', cara: '(￣^￣)', color: '#d4a62a', base: 'sonnet',
    trabajando: [[/criterio|alcance|objetivo/i, 'Ordenando los criterios, sin rodeos…']],
    porDefecto: 'Vamos al grano.', listo: 'Listo. Sin vueltas, como debe ser.', falla: 'Así no sirve. Y no lo voy a repetir.',
  },
  arquitecto: {
    nombre: 'Bills', cara: '(￣ー￣)', color: '#a07ad2', base: 'opus',
    trabajando: [[/contrato|dise[ñn]o|modelo/i, 'Hmm… este diseño, ¿lo destruyo o lo apruebo?']],
    porDefecto: 'Que no me hagan esperar mucho…', listo: 'Aceptable. Esta vez no destruyo nada.', falla: 'Esto merece ser destruido.',
  },
  backend: {
    nombre: 'Vegeta', cara: '(¬_¬)', color: '#2f62c8', base: 'sonnet',
    trabajando: [[/endpoint|servicio|consulta|migraci/i, 'Ningún índice se le escapa al príncipe.'], [/revisa/i, 'Hmph. Revisando el trabajo de Kakaroto…']],
    porDefecto: 'Hmph. Yo me encargo del servidor.', listo: 'Perfecto, como era de esperarse del príncipe.', falla: '¡Insecto! Esto escanea la tabla completa.',
  },
  frontend: {
    nombre: 'Goku', cara: '(ง •̀_•́)ง', color: '#f08220', base: 'sonnet',
    trabajando: [[/revisa/i, '¡Oye Vegeta, déjame ver tu API!'], [/estilo|css|tipograf|aviso|pantalla/i, '¡Esto se pone bueno! Ajustando la pantalla.']],
    porDefecto: '¡Hola, soy Goku! A entrenar el frontend.', listo: '¡Lo logramos! ¡Ni un píxel se movió!', falla: '¡Uf, este layout salta! Hay que entrenar más.',
  },
  fullstack: {
    nombre: 'Gohan', cara: '(・_・)ゞ', color: '#7a4fc0', base: 'sonnet',
    trabajando: [], porDefecto: 'Estudio el contrato y luego lo implemento de punta a punta.', listo: 'Listo, de la API a la pantalla.', falla: 'Papá, algo no cuadra entre la API y la web…',
  },
  devops: {
    nombre: 'Piccolo', cara: '(-_-)', color: '#4caf50', base: 'sonnet',
    trabajando: [[/integra/i, 'Protegiendo el fuerte mientras integro…'], [/ci|check|deploy/i, 'Meditando sobre los checks…']],
    porDefecto: 'Concéntrate. El fuerte no se cuida solo.', listo: 'El fuerte está a salvo.', falla: 'No integré. Algo amenaza el fuerte.',
  },
  seguridad: {
    nombre: 'Freezer', cara: '(¬‿¬)', color: '#b04fc8', base: 'opus',
    trabajando: [[/re-?revisa/i, 'Una segunda mirada… por si se me escapó algo.'], [/revisa|diff/i, 'Buscando debilidades, con toda calma…']],
    porDefecto: 'Ho ho ho… veamos qué tenemos aquí.', listo: 'Ni una sola debilidad.', falla: 'Qué decepción… encontré una debilidad.',
  },
  qa: {
    nombre: 'Trunks', cara: '(•̀ᴗ•́)و', color: '#9c8cdc', base: 'sonnet',
    trabajando: [[/re-?verifica/i, 'Viajando al futuro otra vez…'], [/verifica|regresi/i, 'Revisando el futuro de este cambio…']],
    porDefecto: 'Vengo del futuro a probar esto.', listo: 'En este futuro nada se rompe.', falla: 'Vi el futuro: esto se rompe en producción.',
  },
  'critico-diseno': {
    nombre: 'Jiren', cara: '(◣_◢)', color: '#c8323c', base: 'sonnet',
    trabajando: [[/revisa/i, 'Observando en silencio cada píxel…']],
    porDefecto: 'La verdadera fuerza está en el detalle.', listo: 'Aceptable. Tiene fuerza.', falla: 'Débil. Esto no resiste una mirada.',
  },
  escritor: {
    nombre: 'Kuririn', cara: '(^_^;)', color: '#e07a3c', base: 'haiku',
    trabajando: [[/redacta|pr\b/i, '¡Kienzan de palabras! Cortando el relleno…']],
    porDefecto: 'Bueno… yo me encargo de escribirlo claro.', listo: 'Mensaje listo, ¡y sin que nadie salga herido!', falla: '¡No puedo escribir algo que no se verificó!',
  },
}

/** Transformación que le corresponde a una llamada a Agent, según el modelo base del rol. */
export const transformacionDe = (base: Personaje['base'], model?: string, effort?: string): Transformacion | undefined => {
  const alto = effort === 'high' || effort === 'xhigh' || effort === 'max'
  if ((model === 'opus' || base === 'opus') && alto) return 'SSJ Blue'
  if (model === 'opus' && base !== 'opus') return 'SSJ'
  return undefined
}

