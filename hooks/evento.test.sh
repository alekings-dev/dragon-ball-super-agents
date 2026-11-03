#!/bin/sh
# Prueba de hooks/evento.sh: inicio con transformación, entrega con bloqueo y agentes ajenos al equipo.
set -e
dir=$(mktemp -d); trap 'rm -rf "$dir"' EXIT
hook="$(dirname "$0")/evento.sh"
echo '{"hook_event_name":"PreToolUse","cwd":"/r/Radar-social","tool_input":{"subagent_type":"equipo-dbs:devops","description":"Piccolo integra PR 1","model":"opus"}}' | HOME=$dir sh "$hook"
echo '{"hook_event_name":"SubagentStop","cwd":"/r/Radar-social","agent_type":"equipo-dbs:qa","last_assistant_message":"Regresión e2e: 3 pasan, 1 fallan (nuevos: 1)"}' | HOME=$dir sh "$hook"
echo '{"hook_event_name":"Stop","last_assistant_message":"hola"}' | HOME=$dir sh "$hook"
f="$dir/.claude/equipo-dbs/eventos.jsonl"
[ "$(wc -l < "$f")" -eq 2 ] || { echo "FALLA: se esperaban 2 eventos"; cat "$f"; exit 1; }
jq -e 'select(.tipo=="inicio") | .rol=="devops" and .tarea=="Piccolo integra PR 1" and .model=="opus" and .proyecto=="Radar-social"' "$f" >/dev/null
jq -e 'select(.tipo=="fin") | .rol=="qa" and .bloqueo==true' "$f" >/dev/null
echo "evento.sh: OK"
