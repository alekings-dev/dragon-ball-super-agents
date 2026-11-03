#!/bin/sh
# Hooks PreToolUse (Agent) y SubagentStop: anota cada inicio y cada entrega del equipo en
# ~/.claude/equipo-dbs/eventos.jsonl, que lee el mapa (scripts/visor.mjs). Sin jq, no hace nada.
command -v jq >/dev/null 2>&1 || exit 0
dir="${HOME}/.claude/equipo-dbs"; archivo="$dir/eventos.jsonl"
mkdir -p "$dir"
input=$(cat)
evento=$(printf '%s' "$input" | jq -c --arg t "$(date +%s)000" '
  (.hook_event_name // "") as $h
  | (.cwd // "" | split("/") | last) as $proyecto
  | if $h == "PreToolUse" then
      { t: ($t|tonumber), tipo: "inicio", rol: (.tool_input.subagent_type // "" | sub("^equipo-dbs:"; "")),
        tarea: (.tool_input.description // ""), model: (.tool_input.model // ""), effort: (.tool_input.effort // ""), proyecto: $proyecto }
    elif $h == "SubagentStop" then
      (.last_assistant_message // "") as $m
      | { t: ($t|tonumber), tipo: "fin", rol: (.agent_type // "" | sub("^equipo-dbs:"; "")), proyecto: $proyecto,
          bloqueo: ($m | test("\\*\\*Bloquea\\*\\*|nuevos: [1-9]|❌|[Nn]o integré")) }
    else empty end
  | select(.rol != "")' 2>/dev/null)
[ -n "$evento" ] || exit 0
printf '%s\n' "$evento" >> "$archivo"
# ponytail: recorte simple; si el archivo pasa de 2000 líneas quedan las últimas 500.
[ "$(wc -l < "$archivo")" -gt 2000 ] && tail -n 500 "$archivo" > "$archivo.tmp" && mv "$archivo.tmp" "$archivo"
exit 0
