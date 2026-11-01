#!/usr/bin/env bash
# Checks for the user-facing Elasticsearch stack (docker/elasticsearch/, issue #13).
# Each check prints PASS/FAIL; the script exits non-zero if any fails.
#
#   npm run es:check
#
# Runs an isolated copy of the stack (own project name, own volumes, host ports
# 19200/15601/15173) so it never collides with a stack you already run, and
# always tears it down (-v) on exit. Needs Docker; the first run builds the app.
set -u
cd "$(dirname "$0")/.."

COMPOSE_FILE=docker/elasticsearch/docker-compose.yml
export COMPOSE_PROJECT_NAME=jarin-es-check
export ES_PORT=${ES_PORT:-19200} KIBANA_PORT=${KIBANA_PORT:-15601} APP_PORT=${APP_PORT:-15173}
export ELASTIC_PASSWORD=check-only-password
export KIBANA_PASSWORD=check-only-kibana-password
export KIBANA_ENCRYPTION_KEY=check-only-encryption-key-0123456789abcdef

dc() { docker compose -f "$COMPOSE_FILE" "$@"; }
ES="http://localhost:$ES_PORT"
APP="http://localhost:$APP_PORT"
es() { curl -s -m 10 -u "elastic:$ELASTIC_PASSWORD" "$@"; }

OUT=$(mktemp); fails=0; stack_started=1
# On failure, show what the containers said before tearing them down — in CI
# that output is the only evidence left.
cleanup() {
  if [ "$fails" -gt 0 ]; then
    echo; echo "== container logs (last 40 lines each) =="; dc logs --no-color --tail 40 2>&1
  fi
  dc down -v >/dev/null 2>&1; rm -f "$OUT"
}
trap cleanup EXIT

check() {
  local name=$1; shift
  # Once the stack failed to start, the rest cannot pass — fail fast, don't wait out every timeout.
  if [ "$stack_started" -eq 0 ] && [ "$name" != "compose file is valid" ]; then
    echo "FAIL  $name"; echo "        skipped: the stack did not start"; fails=$((fails + 1)); return 1
  fi
  if "$@" >"$OUT" 2>&1; then echo "PASS  $name"; else
    echo "FAIL  $name"; sed 's/^/        /' "$OUT" | head -6; fails=$((fails + 1)); return 1
  fi
}

# Poll `cmd` until it succeeds or `seconds` pass.
wait_for() {
  local seconds=$1; shift
  for _ in $(seq 1 "$seconds"); do "$@" >/dev/null 2>&1 && return 0; sleep 1; done
  "$@"
}

es_ready()     { es "$ES/_cluster/health" | grep -qE '"status":"(green|yellow)"'; }
kibana_ready() { es "http://localhost:$KIBANA_PORT/api/status" | grep -q '"level":"available"'; }
app_ready()    { curl -s -m 5 "$APP/" | grep -qi "<title>"; }

stack_up() {
  dc up -d --build >/dev/null || return 1
  wait_for 240 es_ready
}

cors_preflight() { # $1 = origin; prints the allow-origin header (empty if blocked)
  curl -s -m 5 -i -X OPTIONS "$ES/" -H "Origin: $1" \
    -H "Access-Control-Request-Method: GET" -H "Access-Control-Request-Headers: authorization" \
    | tr -d '\r' | grep -i '^access-control-allow-origin:' | awk '{print $2}'
}

doc_present() { es "$ES/jarin-stackcheck/_doc/1" | grep -q '"found":true'; }

cors_ok()      { [ "$(cors_preflight "$APP")" = "$APP" ] && [ -z "$(cors_preflight http://evil.example)" ]; }
survives_restart() { dc down >/dev/null && stack_up && doc_present; }
snapshot_setup_exists() {
  es "$ES/_snapshot/jarin-local" | grep -q "jarin-local" && es "$ES/_slm/policy/jarin-daily" | grep -q "jarin-daily"
}
snapshot_roundtrip() {
  es -X PUT "$ES/_snapshot/jarin-local/check-1?wait_for_completion=true" -H 'Content-Type: application/json' \
    -d '{"indices":"jarin-stackcheck","include_global_state":false}' | grep -q '"state":"SUCCESS"' \
  && es -X DELETE "$ES/jarin-stackcheck" >/dev/null \
  && es -X POST "$ES/_snapshot/jarin-local/check-1/_restore?wait_for_completion=true" | grep -q '"failed":0' \
  && doc_present
}
volume_removed_means_data_gone() { dc down -v >/dev/null && stack_up && ! doc_present; }

echo "== Elasticsearch stack =="
check "compose file is valid"                              dc config -q
check "stack starts; Elasticsearch is green/yellow"        stack_up || stack_started=0
check "Kibana is available"                                wait_for 180 kibana_ready
check "Jars app is served on $APP"                         wait_for 60 app_ready
check "CORS allows the app origin and blocks a stranger"   cors_ok

es -X PUT "$ES/jarin-stackcheck/_doc/1?refresh=true" -H 'Content-Type: application/json' \
  -d '{"amountMinor":1250}' >/dev/null
check "a document survives down/up (named volume)"         survives_restart
check "snapshot repository and daily policy exist"         snapshot_setup_exists
check "a snapshot can be taken and restored"               snapshot_roundtrip
check "down -v removes the data (the documented destructive path)" volume_removed_means_data_gone

echo
if [ "$fails" -eq 0 ]; then echo "all checks passed"; else echo "$fails check(s) failed"; exit 1; fi
