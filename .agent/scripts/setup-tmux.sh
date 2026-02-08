#!/bin/bash
# Reflexio Multi-Agent tmux Session Setup
# Usage: bash .agent/scripts/setup-tmux.sh [developer_count]

set -euo pipefail

PROJECT_ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
AGENT_DIR="${PROJECT_ROOT}/.agent"
ROLES_DIR="${AGENT_DIR}/roles"
MESSAGES_DIR="${AGENT_DIR}/messages"
BOARD_FILE="${AGENT_DIR}/board.md"
COMMON_PROTOCOL="${ROLES_DIR}/_common.md"
SESSION_NAME="reflexio-agents"
DEV_COUNT="${1:-5}"

echo "================================================"
echo " Reflexio Multi-Agent System セットアップ"
echo "================================================"
echo " プロジェクト: ${PROJECT_ROOT}"
echo " DEV数: ${DEV_COUNT}"
echo ""

# --- Pre-flight checks ---
command -v tmux >/dev/null 2>&1 || { echo "[ERROR] tmux が見つかりません。sudo apt install tmux で導入してください"; exit 1; }
command -v claude >/dev/null 2>&1 || { echo "[ERROR] claude CLI が見つかりません"; exit 1; }

if tmux has-session -t "${SESSION_NAME}" 2>/dev/null; then
    echo "[setup] 既存セッション '${SESSION_NAME}' を終了します"
    tmux kill-session -t "${SESSION_NAME}"
fi

mkdir -p "${MESSAGES_DIR}"

# Initialize board if missing
if [ ! -f "${BOARD_FILE}" ]; then
    cat > "${BOARD_FILE}" << 'BOARD_EOF'
# Agent Message Board

このファイルはエージェント間メッセージの通知ログです。
新しいメッセージを送信したら、このファイルの末尾に1行追加してください。

## メッセージログ

| timestamp | id | from | to | type | subject | status |
|---|---|---|---|---|---|---|
BOARD_EOF
fi

# --- Build system prompt from role file + common protocol ---
build_prompt() {
    local agent_id="$1"
    local role_file="$2"

    local role_content
    role_content=$(<"${role_file}")

    local common_content
    common_content=$(<"${COMMON_PROTOCOL}")

    # Replace {AGENT_ID} placeholder (for DEV template)
    role_content="${role_content//\{AGENT_ID\}/${agent_id}}"

    # Append common protocol
    echo "${role_content}"
    echo ""
    echo "---"
    echo "以下の共通通信プロトコルに従ってください:"
    echo ""
    echo "${common_content}"
}

# --- Create tmux session ---
echo "[setup] tmux セッションを作成中..."

# Window 0: WATCHER
tmux new-session -d -s "${SESSION_NAME}" -n "WATCHER" -c "${PROJECT_ROOT}"

# Window 1: PM
tmux new-window -t "${SESSION_NAME}" -n "PM" -c "${PROJECT_ROOT}"

# Window 2: PL
tmux new-window -t "${SESSION_NAME}" -n "PL" -c "${PROJECT_ROOT}"

# Windows 3..N+2: DEV1..DEVN
for i in $(seq 1 "${DEV_COUNT}"); do
    tmux new-window -t "${SESSION_NAME}" -n "DEV${i}" -c "${PROJECT_ROOT}"
done

# LIBRARIAN, TESTER, REVIEWER
tmux new-window -t "${SESSION_NAME}" -n "LIBRARIAN" -c "${PROJECT_ROOT}"
tmux new-window -t "${SESSION_NAME}" -n "TESTER" -c "${PROJECT_ROOT}"
tmux new-window -t "${SESSION_NAME}" -n "REVIEWER" -c "${PROJECT_ROOT}"

echo "[setup] ウィンドウ作成完了"

# --- Start Claude Code in each agent window ---
start_agent() {
    local window_name="$1"
    local agent_id="$2"
    local role_file="$3"

    echo "[setup] ${agent_id} を起動中..."

    # Build prompt and write to temp file (avoids shell escaping issues)
    local prompt_file="${AGENT_DIR}/.tmp_prompt_${agent_id}"
    build_prompt "${agent_id}" "${role_file}" > "${prompt_file}"

    # Start claude with system prompt and permissive tools
    tmux send-keys -t "${SESSION_NAME}:${window_name}" \
        "claude --system-prompt \"\$(cat '${prompt_file}')\" --allowedTools 'Bash Read Write Edit Glob Grep' --dangerously-skip-permissions" Enter

    sleep 2

    # Send initial instruction
    tmux send-keys -t "${SESSION_NAME}:${window_name}" \
        "あなたは ${agent_id} です。ロール定義を確認しました。.agent/board.md を確認し、自分宛の unread メッセージがあれば読んでください。なければメッセージを待機してください。" Enter
}

# Start all agents
start_agent "PM" "PM" "${ROLES_DIR}/PM.md"
start_agent "PL" "PL" "${ROLES_DIR}/PL.md"

for i in $(seq 1 "${DEV_COUNT}"); do
    start_agent "DEV${i}" "DEV${i}" "${ROLES_DIR}/DEV.md"
done

start_agent "LIBRARIAN" "LIBRARIAN" "${ROLES_DIR}/LIBRARIAN.md"
start_agent "TESTER" "TESTER" "${ROLES_DIR}/TESTER.md"
start_agent "REVIEWER" "REVIEWER" "${ROLES_DIR}/REVIEWER.md"

# --- Start watcher ---
echo "[setup] ウォッチャーを起動中..."
tmux send-keys -t "${SESSION_NAME}:WATCHER" \
    "bash '${AGENT_DIR}/scripts/watcher.sh'" Enter

# --- Done ---
echo ""
echo "================================================"
echo " 起動完了"
echo "================================================"
echo " セッション: ${SESSION_NAME}"
echo ""
echo " ウィンドウ一覧:"
echo "   0: WATCHER   (メッセージ監視)"
echo "   1: PM        (Project Manager)"
echo "   2: PL        (Project Lead)"
for i in $(seq 1 "${DEV_COUNT}"); do
    printf "   %d: DEV%-6s (Developer %d)\n" "$((i+2))" "${i}" "${i}"
done
echo "   $((DEV_COUNT+3)): LIBRARIAN (ドキュメント管理)"
echo "   $((DEV_COUNT+4)): TESTER    (テスト担当)"
echo "   $((DEV_COUNT+5)): REVIEWER  (コードレビュー)"
echo ""
echo " 接続: tmux attach -t ${SESSION_NAME}"
echo " ウィンドウ切替: Ctrl+b → 番号"
echo "================================================"

# Attach if interactive
if [ -t 1 ]; then
    tmux attach -t "${SESSION_NAME}"
fi
