---
name: mapa
description: Abre en el navegador el mapa del equipo Dragon Ball (una sala por especialista, Hit al centro y el feed «En vivo» de quién delegó y quién entregó). Úsala cuando pidan «abre el mapa del equipo», «muéstrame a los agentes trabajando» o /mapa. Funciona en Claude Code y OpenCode.
---

# Mapa del equipo

1. Levanta el visor en segundo plano, usando la ruta absoluta de esta skill:
   `node "<carpeta de esta skill>/../../scripts/visor.mjs"`
   - En Claude Code: `Bash` con `run_in_background: true`.
   - En OpenCode: `shell` con `background: true`.
   - Si el puerto 4321 está ocupado y `curl -s localhost:4321/ >/dev/null` responde, el visor ya corre: no lo levantes de nuevo.
   Requiere Node 23.6 o más nuevo.
2. Ábrelo: `open http://localhost:4321` (en Linux, `xdg-open`).
3. Dile a la persona que el mapa se llena con los eventos de `~/.claude/equipo-dbs/eventos.jsonl`: en Claude Code los anota `hooks/evento.sh` (necesita `jq`) y en OpenCode los escribe el plugin (sin `jq`). El visor solo escucha en `127.0.0.1` y el archivo nunca sale de su equipo. En Cursor no hay hooks, así que las salas se quedan quietas.
