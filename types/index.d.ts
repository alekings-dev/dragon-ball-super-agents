export type Miembro = {
  id: string
  tipo: string
  tarea: string
  estado: 'trabaja' | 'terminó' | 'falló'
  desde: number
  /** Cuándo se vio terminado por primera vez (para el tiempo total). */
  hasta?: number
}

/** Transformación con la que Hitto lanzó cada tarea, por su descripción. */
export type Transformacion = 'SSJ' | 'SSJ Blue'

declare module 'claude-code' {
  interface PluginState {
    'equipo-dbs': { miembros: Miembro[]; transformaciones: Record<string, Transformacion> }
  }
}
