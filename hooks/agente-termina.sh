#!/bin/sh
# Hooks SubagentStop y Stop: cada personaje avisa con voz cuando entrega su reporte (Whis, el líder,
# cuando su respuesta trae la firma «(◕‿◕) Whis»).
# Si el reporte trae un bloqueo, suena una alarma antes de la frase. Sin `say` (otro SO), no hace nada.
command -v say >/dev/null 2>&1 || exit 0
input=$(cat)
agente=$(printf '%s' "$input" | jq -r '.agent_type // ""' 2>/dev/null)
mensaje=$(printf '%s' "$input" | jq -r '.last_assistant_message // ""' 2>/dev/null)
[ -z "$agente" ] && printf '%s' "$mensaje" | grep -q '(◕‿◕) Whis' && agente=lider

hombre="Eddy (Español (México))"; mujer="Paulina"
case "$agente" in
  frontend)       voz=$hombre; frase="¡Kamehameha! Goku terminó." ;;
  backend)        voz="Rocko (Español (México))"; frase="Vegeta terminó. Como era de esperarse." ;;
  fullstack)      voz="Reed (Español (México))"; frase="Gohan terminó su parte." ;;
  devops)         voz="Grandpa (Español (México))"; frase="Piccolo: el fuerte está a salvo." ;;
  seguridad)      voz="Rocko (Español (México))"; frase="Freezer terminó la revisión." ;;
  qa)             voz=$hombre; frase="Trunks volvió del futuro." ;;
  arquitecto)     voz="Grandpa (Español (México))"; frase="Bills despertó y dio su veredicto." ;;
  producto)       voz=$mujer; frase="Bulma tiene su análisis listo." ;;
  critico-diseno) voz="Flo (Español (México))"; frase="Vados terminó de revisar el diseño." ;;
  escritor)       voz=$hombre; frase="Kaio-sama: mensaje listo." ;;
  lider)          voz="Grandpa (Español (México))"; frase="Whis: el entrenamiento terminó." ;;
  *)              exit 0 ;;
esac

# Bloqueo: Freezer con hallazgo «Bloquea», QA con fallos nuevos o ❌, o cualquier rol que diga que no integró.
audio="$(dirname "$0")/voces/$agente.mp3"
if printf '%s' "$mensaje" | grep -qE '\*\*Bloquea\*\*|nuevos: [1-9]|❌|[Nn]o integré'; then
  afplay /System/Library/Sounds/Sosumi.aiff 2>/dev/null
  frase="¡Alerta! $frase Hay un bloqueo."
  audio="$(dirname "$0")/voces/$agente-alerta.mp3"
fi
# Voz de Fish Audio si ya se generó (generar-voces.sh); si no, la de macOS.
if [ -s "$audio" ]; then afplay "$audio" 2>/dev/null && exit 0; fi
say -v "$voz" "$frase" 2>/dev/null || say "$frase"
exit 0
