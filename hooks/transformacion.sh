#!/bin/sh
# Hook PreToolUse (Agent): cuando Hit delega con transformación, el personaje grita al entrar.
# Super Saiyan = model opus en un rol cuya forma base no es opus; Super Saiyan Blue = effort high o más.
# Audios en voces/<rol>-ssj.mp3 y voces/<rol>-blue.mp3 (generar-voces.sh); sin ellos, voz de macOS.
command -v say >/dev/null 2>&1 || exit 0
dir=$(dirname "$0")
input=$(cat)
rol=$(printf '%s' "$input" | jq -r '.tool_input.subagent_type // ""' 2>/dev/null)
rol=${rol#equipo-dbs:}
modelo=$(printf '%s' "$input" | jq -r '.tool_input.model // ""' 2>/dev/null)
esfuerzo=$(printf '%s' "$input" | jq -r '.tool_input.effort // ""' 2>/dev/null)
[ -f "$dir/../agents/$rol.md" ] || exit 0

case "$esfuerzo" in
  high|xhigh|max) nivel=blue ;;
  *) base=$(sed -n 's/^model: //p' "$dir/../agents/$rol.md" | head -1)
     [ "$modelo" = opus ] && [ "$base" != opus ] && nivel=ssj || exit 0 ;;
esac

. "$dir/turno.sh"
esperar_turno || exit 0
audio="$dir/voces/$rol-$nivel.mp3"
if [ -s "$audio" ]; then afplay "$audio" 2>/dev/null && exit 0; fi
frase=$(awk -F '\t' -v r="$rol" -v n="$nivel" '$1==r && $2==n {print $3}' "$dir/transformaciones.tsv")
say -v "Eddy (Español (México))" "${frase:-¡Transformación!}" 2>/dev/null || say "${frase:-¡Transformación!}"
exit 0
