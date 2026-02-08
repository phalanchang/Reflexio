#!/bin/bash
# Reflexio Multi-Agent Message Watcher
# Polls board.md for new entries and notifies target agents via tmux send-keys

set -uo pipefail

PROJECT_ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
BOARD_FILE="${PROJECT_ROOT}/.agent/board.md"
SESSION_NAME="reflexio-agents"
POLL_INTERVAL=1

# Agent ID → tmux window name mapping
declare -A AGENT_WINDOWS=(
    ["PM"]="PM"
    ["PL"]="PL"
    ["DEV1"]="DEV1"
    ["DEV2"]="DEV2"
    ["DEV3"]="DEV3"
    ["DEV4"]="DEV4"
    ["DEV5"]="DEV5"
    ["LIBRARIAN"]="LIBRARIAN"
    ["TESTER"]="TESTER"
    ["REVIEWER"]="REVIEWER"
)

# Initialize line count
LAST_LINE_COUNT=0
if [ -f "${BOARD_FILE}" ]; then
    LAST_LINE_COUNT=$(wc -l < "${BOARD_FILE}")
fi

echo "================================================"
echo " Reflexio Message Watcher"
echo "================================================"
echo " 監視対象: ${BOARD_FILE}"
echo " ポーリング間隔: ${POLL_INTERVAL}秒"
echo " 初期行数: ${LAST_LINE_COUNT}"
echo " 新しいメッセージを監視中..."
echo ""

while true; do
    sleep "${POLL_INTERVAL}"

    [ -f "${BOARD_FILE}" ] || continue

    CURRENT_LINE_COUNT=$(wc -l < "${BOARD_FILE}")

    if [ "${CURRENT_LINE_COUNT}" -gt "${LAST_LINE_COUNT}" ]; then
        NEW_LINES_START=$((LAST_LINE_COUNT + 1))
        NEW_LINES=$(tail -n +"${NEW_LINES_START}" "${BOARD_FILE}")

        while IFS= read -r line; do
            # Skip empty lines, header, separator
            [[ -z "${line}" ]] && continue
            [[ "${line}" == "|---"* ]] && continue
            [[ "${line}" == "| timestamp"* ]] && continue
            [[ "${line}" != "|"* ]] && continue

            # Parse markdown table row: | timestamp | id | from | to | type | subject | status |
            local_id=$(echo "${line}" | awk -F'|' '{gsub(/^[ \t]+|[ \t]+$/, "", $3); print $3}')
            local_from=$(echo "${line}" | awk -F'|' '{gsub(/^[ \t]+|[ \t]+$/, "", $4); print $4}')
            local_to=$(echo "${line}" | awk -F'|' '{gsub(/^[ \t]+|[ \t]+$/, "", $5); print $5}')
            local_subject=$(echo "${line}" | awk -F'|' '{gsub(/^[ \t]+|[ \t]+$/, "", $7); print $7}')

            # Validate
            [[ -z "${local_to}" ]] && continue
            [[ "${local_to}" == "to" ]] && continue

            echo "[$(date '+%H:%M:%S')] 新メッセージ: ${local_id} (${local_from} → ${local_to})"

            # Look up tmux window
            local_window="${AGENT_WINDOWS[${local_to}]:-}"
            if [ -z "${local_window}" ]; then
                echo "  WARNING: 不明なエージェント '${local_to}' - スキップ"
                continue
            fi

            # Check window exists
            if ! tmux list-windows -t "${SESSION_NAME}" -F '#{window_name}' 2>/dev/null | grep -q "^${local_window}$"; then
                echo "  WARNING: ウィンドウ '${local_window}' が見つかりません - スキップ"
                continue
            fi

            # Send notification via tmux send-keys
            NOTIFICATION="[MESSAGE] ${local_id} を読んでください。ファイル: .agent/messages/${local_id}.yaml (送信元: ${local_from}, 件名: ${local_subject})"
            tmux send-keys -t "${SESSION_NAME}:${local_window}" "${NOTIFICATION}" Enter

            echo "  → ${local_to} に通知送信完了"

        done <<< "${NEW_LINES}"

        LAST_LINE_COUNT="${CURRENT_LINE_COUNT}"
    fi
done
