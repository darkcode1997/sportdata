#!/usr/bin/env bash

set -Eeuo pipefail

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

DEPLOY_TIMEOUT="${DEPLOY_TIMEOUT:-240}"
PULL_CODE=false
RUN_SEED=false
NO_CACHE=false

usage() {
  cat <<'EOF'
Triển khai SportData bằng Docker Compose.

Cách dùng:
  bash deploy.sh [tùy chọn]

Tùy chọn:
  --pull           Chạy git pull --ff-only trước khi deploy.
  --seed           Chạy seed database (chỉ nên dùng lần triển khai đầu tiên).
  --no-cache       Build lại image mà không dùng Docker cache.
  --timeout <giây> Thời gian tối đa chờ mỗi service healthy (mặc định 240).
  -h, --help       Hiển thị hướng dẫn này.

Mặc định script không chạy seed để tránh ghi lại dữ liệu demo khi cập nhật server.
EOF
}

log() {
  printf '\n[%s] %s\n' "$(date '+%Y-%m-%d %H:%M:%S')" "$*"
}

fail() {
  printf '\n[ERROR] %s\n' "$*" >&2
  exit 1
}

while (($# > 0)); do
  case "$1" in
    --pull)
      PULL_CODE=true
      shift
      ;;
    --seed)
      RUN_SEED=true
      shift
      ;;
    --no-cache)
      NO_CACHE=true
      shift
      ;;
    --timeout)
      [[ $# -ge 2 ]] || fail "Thiếu số giây sau --timeout."
      DEPLOY_TIMEOUT="$2"
      shift 2
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      fail "Tùy chọn không hợp lệ: $1. Dùng --help để xem hướng dẫn."
      ;;
  esac
done

[[ "$DEPLOY_TIMEOUT" =~ ^[1-9][0-9]*$ ]] || fail "DEPLOY_TIMEOUT phải là số nguyên dương."
[[ -f "$SCRIPT_DIR/docker-compose.yml" ]] || fail "Không tìm thấy docker-compose.yml tại $SCRIPT_DIR."
[[ -f "$SCRIPT_DIR/.env" ]] || fail "Không tìm thấy .env. Hãy sao chép .env.example thành .env và cấu hình trước."
command -v docker >/dev/null 2>&1 || fail "Server chưa cài Docker."
docker compose version >/dev/null 2>&1 || fail "Docker Compose plugin chưa sẵn sàng."
docker info >/dev/null 2>&1 || fail "Docker daemon chưa chạy hoặc tài khoản hiện tại không có quyền truy cập."

if command -v flock >/dev/null 2>&1; then
  LOCK_FILE="/tmp/sportdata-deploy-$(id -u).lock"
  exec 9>"$LOCK_FILE"
  flock -n 9 || fail "Một tiến trình deploy SportData khác đang chạy."
fi

COMPOSE=(docker compose --env-file "$SCRIPT_DIR/.env" -f "$SCRIPT_DIR/docker-compose.yml")

on_error() {
  local exit_code=$?
  trap - ERR
  printf '\n[ERROR] Deploy thất bại (mã %s). Trạng thái hiện tại:\n' "$exit_code" >&2
  "${COMPOSE[@]}" ps >&2 || true
  printf '\nLog gần nhất của backend/frontend:\n' >&2
  "${COMPOSE[@]}" logs --tail=100 backend frontend >&2 || true
  exit "$exit_code"
}
trap on_error ERR

if $PULL_CODE; then
  command -v git >/dev/null 2>&1 || fail "Không tìm thấy git trên server."
  [[ -d "$SCRIPT_DIR/.git" ]] || fail "Thư mục hiện tại không phải Git repository."
  log "Cập nhật source code"
  git -C "$SCRIPT_DIR" pull --ff-only
fi

log "Kiểm tra cấu hình Docker Compose"
"${COMPOSE[@]}" config --quiet

# docker-compose.yml mặc định bật seed cho môi trường phát triển. Khi deploy,
# chỉ bật lại bằng --seed để tránh làm mới dữ liệu demo ngoài ý muốn.
if $RUN_SEED; then
  export SEED_DATABASE=true
  log "Seed database được bật cho lần deploy này"
else
  export SEED_DATABASE=false
  log "Seed database đã tắt (dùng --seed nếu đây là lần cài đặt đầu tiên)"
fi

wait_for_service() {
  local service="$1"
  local elapsed=0
  local container_id
  local state

  container_id="$("${COMPOSE[@]}" ps -q "$service")"
  [[ -n "$container_id" ]] || fail "Không tìm thấy container của service $service."

  while ((elapsed < DEPLOY_TIMEOUT)); do
    state="$(docker inspect --format '{{if .State.Health}}{{.State.Health.Status}}{{else}}{{.State.Status}}{{end}}' "$container_id" 2>/dev/null || true)"
    case "$state" in
      healthy|running)
        log "$service đã sẵn sàng"
        return 0
        ;;
      unhealthy|exited|dead)
        printf '[ERROR] Service %s ở trạng thái %s.\n' "$service" "$state" >&2
        "${COMPOSE[@]}" logs --tail=100 "$service" >&2 || true
        return 1
        ;;
    esac
    sleep 2
    elapsed=$((elapsed + 2))
  done

  printf '[ERROR] Hết thời gian chờ %s healthy sau %s giây.\n' "$service" "$DEPLOY_TIMEOUT" >&2
  "${COMPOSE[@]}" logs --tail=100 "$service" >&2 || true
  return 1
}

log "Khởi động PostgreSQL"
"${COMPOSE[@]}" up -d postgres
wait_for_service postgres

log "Build backend và frontend"
BUILD_ARGS=(--pull)
if $NO_CACHE; then
  BUILD_ARGS+=(--no-cache)
fi
"${COMPOSE[@]}" build "${BUILD_ARGS[@]}" backend frontend

log "Cập nhật backend"
"${COMPOSE[@]}" up -d --no-deps backend
wait_for_service backend

log "Cập nhật frontend"
"${COMPOSE[@]}" up -d --no-deps frontend
wait_for_service frontend

log "Deploy SportData thành công"
"${COMPOSE[@]}" ps

