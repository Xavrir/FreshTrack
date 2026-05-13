#!/usr/bin/env bash
# Stitch screen generation helper
# Usage: ./generate.sh <screen-name> <prompt-file>
# Requires: STITCH_API_KEY environment variable

set -euo pipefail

SCREEN_NAME="${1:?Usage: ./generate.sh <screen-name> <prompt-file>}"
PROMPT_FILE="${2:?Usage: ./generate.sh <screen-name> <prompt-file>}"
PROJECT_ID="14824261495157425687"
QUEUE_DIR="$(dirname "$0")/queue"
STITCH_CLI="/home/xavrir/.npm/_npx/829c6278c197c365/node_modules/@_davideast/stitch-mcp/dist/cli.js"

export STITCH_USE_SYSTEM_GCLOUD=0
export STITCH_API_KEY="${STITCH_API_KEY:?STITCH_API_KEY not set}"

PROMPT=$(cat "$PROMPT_FILE")

echo "🎨 Generating: $SCREEN_NAME"
RESULT=$(bun run "$STITCH_CLI" tool generate_screen_from_text -d "$(jq -n \
  --arg pid "$PROJECT_ID" \
  --arg prompt "$PROMPT" \
  '{projectId: $pid, deviceType: "MOBILE", modelId: "GEMINI_3_FLASH", prompt: $prompt}')" -o json 2>&1)

# Extract screen ID
SCREEN_ID=$(echo "$RESULT" | python3 -c "
import sys, json
data = json.load(sys.stdin)
screens = data.get('outputComponents', [{}])[0].get('design', {}).get('screens', [])
if screens:
    sid = screens[0]['id']
    print(sid)
else:
    print('ERROR: No screens in response')
    sys.exit(1)
")

echo "✅ Screen ID: $SCREEN_ID"

# Download HTML
bun run "$STITCH_CLI" tool get_screen_code \
  -d "{\"projectId\":\"$PROJECT_ID\",\"screenId\":\"$SCREEN_ID\"}" -o json 2>&1 | \
  python3 -c "
import sys, json
data = json.load(sys.stdin)
html = data.get('htmlContent', '')
with open('$QUEUE_DIR/$SCREEN_NAME.html', 'w') as f:
    f.write(html)
print(f'📄 HTML: {len(html)} chars')
"

# Download screenshot
bun run "$STITCH_CLI" tool get_screen_image \
  -d "{\"projectId\":\"$PROJECT_ID\",\"screenId\":\"$SCREEN_ID\"}" -o json 2>&1 | \
  python3 -c "
import sys, json, base64
data = json.load(sys.stdin)
b64 = data.get('screenshotBase64', '')
if b64:
    with open('$QUEUE_DIR/$SCREEN_NAME.png', 'wb') as f:
        f.write(base64.b64decode(b64))
    print('📸 Screenshot saved')
else:
    print('⚠️  No screenshot')
"

# Save metadata
echo "{\"screenId\": \"$SCREEN_ID\", \"screenName\": \"$SCREEN_NAME\"}" > "$QUEUE_DIR/$SCREEN_NAME.meta.json"
echo "🎉 Done: $SCREEN_NAME → $QUEUE_DIR/"
