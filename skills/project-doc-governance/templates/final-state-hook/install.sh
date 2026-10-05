#!/bin/sh
# 把终态痕迹守卫装进目标仓库（Claude Code 的 PostToolUse hook）。
#
# 用法：sh install.sh <目标仓库根>
#
# 装什么：
#   <仓库>/.claude/hooks/check-final-state.js     守卫本体
#   <仓库>/.claude/hooks/final-state-rules.json   词表副本（从技能母版的 scripts/ 生成，带 rules_version）
#
# 为什么是"生成副本"而不是引用：hook 运行在项目仓库里，无法跨仓库引用技能目录。
# 母版的 scripts/final-state-rules.json 是唯一可编辑的源；改了它以后重新跑本脚本。
# doc-lint 会校验两侧 rules_version 是否一致，不一致会报错提示重新生成。

set -e

TARGET="$1"
if [ -z "$TARGET" ] || [ ! -d "$TARGET" ]; then
  echo "用法：sh install.sh <目标仓库根>" >&2
  exit 1
fi

SCRIPT_DIR=$(cd "$(dirname "$0")" && pwd)
SKILL_DIR=$(cd "$SCRIPT_DIR/../.." && pwd)
SRC_RULES="$SKILL_DIR/scripts/final-state-rules.json"
HOOK_DIR="$TARGET/.claude/hooks"

if [ ! -f "$SRC_RULES" ]; then
  echo "错误：找不到词表母版 $SRC_RULES" >&2
  exit 1
fi

mkdir -p "$HOOK_DIR"
cp "$SCRIPT_DIR/check-final-state.js" "$HOOK_DIR/"
cp "$SRC_RULES" "$HOOK_DIR/"

echo "已安装到 $HOOK_DIR"
echo "词表版本：$(grep -o '"rules_version": *"[^"]*"' "$HOOK_DIR/final-state-rules.json")"
echo
echo "接着把下面这段并入 $TARGET/.claude/settings.json 的 hooks（已存在则合并，不要覆盖整个文件）："
echo
cat <<'EOF'
{
  "hooks": {
    "PostToolUse": [
      {
        "matcher": "Write|Edit",
        "hooks": [
          {
            "type": "command",
            "command": "node \"$CLAUDE_PROJECT_DIR/.claude/hooks/check-final-state.js\"",
            "timeout": 10,
            "statusMessage": "终态自查：扫描过程痕迹"
          }
        ]
      }
    ]
  }
}
EOF
