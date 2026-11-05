#!/bin/sh
# Turno de voz: un solo personaje habla a la vez. Los hooks de voz son async y corren en paralelo
# (por ejemplo, el Stop de Hit y el SubagentStop del último especialista llegan juntos); sin turno,
# los audios se pisan. El turno es un directorio-candado: mkdir es atómico.
# Uso: . "$dir/turno.sh"; esperar_turno || exit 0   (el candado se libera al salir del script)
candado="${TMPDIR:-/tmp}/equipo-dbs-voz.lock"

esperar_turno() {
  i=0
  until mkdir "$candado" 2>/dev/null; do
    # Candado huérfano (un proceso que murió hablando): ningún audio dura más de 30 s.
    edad=$(( $(date +%s) - $(stat -f %m "$candado" 2>/dev/null || stat -c %Y "$candado" 2>/dev/null || date +%s) ))
    [ "$edad" -gt 30 ] && rmdir "$candado" 2>/dev/null
    i=$((i + 1))
    [ "$i" -gt 600 ] && return 1 # 60 s esperando: se rinde en silencio
    sleep 0.1
  done
  trap 'rmdir "$candado" 2>/dev/null' EXIT
  trap 'exit 1' INT TERM
}
