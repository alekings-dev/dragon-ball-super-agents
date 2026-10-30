#!/bin/sh
# Genera con Fish Audio (modelo gratis s2.1-pro-free) los audios que reproduce agente-termina.sh:
# voces/<rol>.mp3 (frase) y voces/<rol>-alerta.mp3 (frase con aviso de bloqueo), según voces.tsv.
# Requiere FISH_API_KEY en el entorno. Salta los audios que ya existen; con -f los regenera.
set -eu
dir=$(cd "$(dirname "$0")" && pwd)
[ -n "${FISH_API_KEY:-}" ] || { echo "Falta FISH_API_KEY" >&2; exit 1; }
mkdir -p "$dir/voces"
forzar=${1:-}

generar() { # salida, voz, texto
  [ -s "$1" ] && [ "$forzar" != "-f" ] && return 0
  cuerpo=$(jq -n --arg t "$3" --arg v "$2" '{text: $t, reference_id: $v, format: "mp3", mp3_bitrate: 64}')
  codigo=$(curl -s -o "$1.tmp" -w '%{http_code}' -X POST https://api.fish.audio/v1/tts \
    -H "Authorization: Bearer $FISH_API_KEY" -H "Content-Type: application/json" -H "model: s2.1-pro-free" \
    -d "$cuerpo")
  if [ "$codigo" = 200 ]; then mv "$1.tmp" "$1"; echo "ok  $(basename "$1")"
  else echo "error $codigo en $(basename "$1"): $(head -c 200 "$1.tmp")" >&2; rm -f "$1.tmp"; fi
}

grep -v '^#' "$dir/voces.tsv" | while IFS="$(printf '\t')" read -r rol voz frase; do
  [ -n "$rol" ] || continue
  generar "$dir/voces/$rol.mp3" "$voz" "$frase"
  generar "$dir/voces/$rol-alerta.mp3" "$voz" "¡Alerta! $frase Hay un bloqueo."
done

# Gritos de transformación (transformacion.sh), con la voz del mismo rol.
grep -v '^#' "$dir/transformaciones.tsv" | while IFS="$(printf '\t')" read -r rol nivel grito; do
  [ -n "$rol" ] || continue
  voz=$(awk -F '\t' -v r="$rol" '$1==r {print $2}' "$dir/voces.tsv")
  generar "$dir/voces/$rol-$nivel.mp3" "$voz" "$grito"
done
