#!/bin/bash
# Reflexio Multi-Agent tmux Session Setup (Pane Split Layout)
# Usage: bash .agent/scripts/setup-tmux.sh [developer_count]
#
# Layout:
#   Window 0: WATCHER (full screen - message monitor)
#   Window 1: PM | PL (vertical split)
#   Window 2: DEV1 | DEV2 | DEV3 (vertical 3-split)
#   Window 3: DEV4 | DEV5 (vertical split)
#   Window 4: LIBRARIAN | TESTER | REVIEWER (vertical 3-split)

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

# --- Start Claude Code in a specific pane ---
# Usage: start_agent <session:window.pane> <agent_id> <role_file>
start_agent() {
    local target="$1"
    local agent_id="$2"
    local role_file="$3"

    echo "[setup] ${agent_id} を起動中... (${target})"

    # Build prompt and write to temp file (avoids shell escaping issues)
    local prompt_file="${AGENT_DIR}/.tmp_prompt_${agent_id}"
    build_prompt "${agent_id}" "${role_file}" > "${prompt_file}"

    # Start claude with system prompt
    tmux send-keys -t "${target}" \
        "claude --system-prompt \"\$(cat '${prompt_file}')\" --allowedTools 'Bash Read Write Edit Glob Grep' --dangerously-skip-permissions" Enter

    sleep 2

    # Send initial instruction
    tmux send-keys -t "${target}" \
        "あなたは ${agent_id} です。ロール定義を確認しました。.agent/board.md を確認し、自分宛の unread メッセージがあれば読んでください。なければメッセージを待機してください。" Enter
}

# ======================================================================
# Create tmux session with pane-split layout
# ======================================================================
echo "[setup] tmux セッションを作成中..."

# --- Window 0: WATCHER (full screen) ---
tmux new-session -d -s "${SESSION_NAME}" -n "WATCHER" -c "${PROJECT_ROOT}"

# --- Window 1: PM | PL (vertical split) ---
tmux new-window -t "${SESSION_NAME}" -n "PM-PL" -c "${PROJECT_ROOT}"
tmux split-window -t "${SESSION_NAME}:PM-PL" -h -c "${PROJECT_ROOT}"
# Now: pane 0 = PM, pane 1 = PL

# --- Window 2+: DEV windows (split into groups of 3 or fewer) ---
dev_window_idx=0
dev_pane_map=()  # Array: dev_pane_map[dev_number] = "window_name.pane_index"

i=1
while [ "${i}" -le "${DEV_COUNT}" ]; do
    # Calculate how many DEVs go in this window (up to 3)
    remaining=$((DEV_COUNT - i + 1))
    if [ "${remaining}" -ge 3 ]; then
        group_size=3
    else
        group_size="${remaining}"
    fi

    window_name="DEV-${i}"
    if [ "${group_size}" -ge 2 ]; then
        last=$((i + group_size - 1))
        window_name="DEV${i}-${last}"
    else
        window_name="DEV${i}"
    fi

    tmux new-window -t "${SESSION_NAME}" -n "${window_name}" -c "${PROJECT_ROOT}"

    # First pane is pane 0 (already created with window)
    dev_pane_map[${i}]="${window_name}.0"

    # Split for additional panes
    for j in $(seq 2 "${group_size}"); do
        tmux split-window -t "${SESSION_NAME}:${window_name}" -h -c "${PROJECT_ROOT}"
        dev_num=$((i + j - 1))
        pane_idx=$((j - 1))
        dev_pane_map[${dev_num}]="${window_name}.${pane_idx}"
    done

    # Even out the pane layout
    tmux select-layout -t "${SESSION_NAME}:${window_name}" even-horizontal

    i=$((i + group_size))
    dev_window_idx=$((dev_window_idx + 1))
done

# --- Window N: LIBRARIAN | TESTER | REVIEWER (vertical 3-split) ---
tmux new-window -t "${SESSION_NAME}" -n "LIB-TST-REV" -c "${PROJECT_ROOT}"
tmux split-window -t "${SESSION_NAME}:LIB-TST-REV" -h -c "${PROJECT_ROOT}"
tmux split-window -t "${SESSION_NAME}:LIB-TST-REV" -h -c "${PROJECT_ROOT}"
tmux select-layout -t "${SESSION_NAME}:LIB-TST-REV" even-horizontal
# pane 0 = LIBRARIAN, pane 1 = TESTER, pane 2 = REVIEWER

# --- Write pane mapping file for watcher.sh ---
PANE_MAP_FILE="${AGENT_DIR}/.pane_map.sh"
cat > "${PANE_MAP_FILE}" << MAPEOF
# Auto-generated by setup-tmux.sh — do not edit manually
declare -A AGENT_PANES=(
    ["PM"]="PM-PL.0"
    ["PL"]="PM-PL.1"
MAPEOF

for dev_i in $(seq 1 "${DEV_COUNT}"); do
    echo "    [\"DEV${dev_i}\"]=\"${dev_pane_map[${dev_i}]}\"" >> "${PANE_MAP_FILE}"
done

cat >> "${PANE_MAP_FILE}" << 'MAPEOF'
    ["LIBRARIAN"]="LIB-TST-REV.0"
    ["TESTER"]="LIB-TST-REV.1"
    ["REVIEWER"]="LIB-TST-REV.2"
)
MAPEOF

echo "[setup] ペインマッピング書き出し完了: ${PANE_MAP_FILE}"
echo "[setup] ウィンドウ・ペイン作成完了"

# ======================================================================
# Start agents in their panes
# ======================================================================

# PM & PL
start_agent "${SESSION_NAME}:PM-PL.0" "PM" "${ROLES_DIR}/PM.md"
start_agent "${SESSION_NAME}:PM-PL.1" "PL" "${ROLES_DIR}/PL.md"

# DEVs
for i in $(seq 1 "${DEV_COUNT}"); do
    target="${SESSION_NAME}:${dev_pane_map[${i}]}"
    start_agent "${target}" "DEV${i}" "${ROLES_DIR}/DEV.md"
done

# LIBRARIAN, TESTER, REVIEWER
start_agent "${SESSION_NAME}:LIB-TST-REV.0" "LIBRARIAN" "${ROLES_DIR}/LIBRARIAN.md"
start_agent "${SESSION_NAME}:LIB-TST-REV.1" "TESTER" "${ROLES_DIR}/TESTER.md"
start_agent "${SESSION_NAME}:LIB-TST-REV.2" "REVIEWER" "${ROLES_DIR}/REVIEWER.md"

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
echo " ウィンドウ構成 (ペイン分割):"
echo "   0: WATCHER         - メッセージ監視"
echo "   1: PM-PL           - PM | PL"

win_idx=2
i=1
while [ "${i}" -le "${DEV_COUNT}" ]; do
    remaining=$((DEV_COUNT - i + 1))
    if [ "${remaining}" -ge 3 ]; then
        group_size=3
    else
        group_size="${remaining}"
    fi
    last=$((i + group_size - 1))
    names=""
    for j in $(seq "${i}" "${last}"); do
        [ -n "${names}" ] && names="${names} | "
        names="${names}DEV${j}"
    done
    printf "   %d: DEV%-12s - %s\n" "${win_idx}" "${i}-${last}" "${names}"
    i=$((i + group_size))
    win_idx=$((win_idx + 1))
done

echo "   ${win_idx}: LIB-TST-REV    - LIBRARIAN | TESTER | REVIEWER"
echo ""
echo " 操作:"
echo "   Ctrl+b → 番号     ウィンドウ切替"
echo "   Ctrl+b → o        同一ウィンドウ内のペイン切替"
echo "   Ctrl+b → 矢印     ペイン移動"
echo "   Ctrl+b → z        ペインの最大化/復帰"
echo "   Ctrl+b → d        デタッチ"
echo ""
echo " 接続: tmux attach -t ${SESSION_NAME}"
echo "================================================"

# Select PM-PL window so user lands on PM pane
tmux select-window -t "${SESSION_NAME}:PM-PL"
tmux select-pane -t "${SESSION_NAME}:PM-PL.0"

# Attach if interactive
if [ -t 1 ]; then
    tmux attach -t "${SESSION_NAME}"
fi
