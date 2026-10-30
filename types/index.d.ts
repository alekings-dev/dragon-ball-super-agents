export type Miembro = {
  id: string
  tipo: string
  tarea: string
  estado: 'trabaja' | 'terminó' | 'falló'
  desde: number
}

declare module 'claude-code' {
  interface PluginState {
    'equipo-dbs': { miembros: Miembro[] }
  }
}
