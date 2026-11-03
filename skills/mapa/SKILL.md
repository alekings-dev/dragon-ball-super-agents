---
name: mapa
description: Abre en el navegador el mapa del equipo Dragon Ball (una sala por especialista, Hitto al centro y el feed «En vivo» de quién delegó y quién entregó). Úsala cuando pidan «abre el mapa del equipo», «muéstrame a los agentes trabajando» o /mapa. Solo Claude Code.
---

# Mapa del equipo

1. Levanta el visor en segundo plano (Bash con `run_in_background: true`), usando la ruta absoluta de esta skill:
   `node "<carpeta de esta skill>/../../scripts/visor.mjs"`
   Si el puerto 4321 está ocupado y `curl -s localhost:4321/ >/dev/null` responde, el visor ya corre: no lo levantes de nuevo.
2. Ábrelo: `open http://localhost:4321` (en Linux, `xdg-open`).
3. Dile a la persona que el mapa se llena con los eventos que anota `hooks/evento.sh` en `~/.claude/equipo-dbs/eventos.jsonl` (cada delegación de Hitto y cada entrega), y que el visor solo escucha en `127.0.0.1`.
