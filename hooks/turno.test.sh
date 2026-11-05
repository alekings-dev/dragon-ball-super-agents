#!/bin/sh
# Prueba de turno.sh: tres voces lanzadas a la vez no se pisan (afplay y say simulados).
set -eu
dir=$(cd "$(dirname "$0")" && pwd)
tmp=$(mktemp -d); trap 'rm -rf "$tmp"' EXIT
mkdir "$tmp/bin"
for cmd in afplay say; do
  printf '#!/bin/sh\necho "inicio $(date +%%s%%N | cut -c1-13)" >> "%s/log"\nsleep 1\necho "fin $(date +%%s%%N | cut -c1-13)" >> "%s/log"\n' "$tmp" "$tmp" > "$tmp/bin/$cmd"
  chmod +x "$tmp/bin/$cmd"
done
for rol in lider qa seguridad; do
  echo "{\"agent_type\":\"equipo-dbs:$rol\",\"last_assistant_message\":\"(⌐■_■) Hit\"}" |
    PATH="$tmp/bin:$PATH" TMPDIR="$tmp" sh "$dir/agente-termina.sh" &
done
wait
# Sin superposición: el log alterna inicio/fin y nunca hay dos «inicio» seguidos.
[ "$(grep -c inicio "$tmp/log")" -eq 3 ] || { echo "FALLA: no sonaron las 3 voces"; cat "$tmp/log"; exit 1; }
awk '{ if ($1 == prev) { print "FALLA: voces superpuestas"; exit 1 } prev = $1 }' "$tmp/log"
[ ! -d "$tmp/equipo-dbs-voz.lock" ] || { echo "FALLA: el candado quedó tomado"; exit 1; }
echo "ok: 3 voces en turno, sin pisarse"
