#!/bin/bash

set -euo pipefail

PROJECT_DIR="/Users/rayluo.r/Documents/Codex/2026-08-03/xian"
GH_BIN="/Users/rayluo.r/Downloads/gh_2.97.0_macOS_arm64/bin/gh"
REPOSITORY="alaodd-lang/mlp-card-picker"

cd "$PROJECT_DIR"

if [ ! -x "$GH_BIN" ]; then
  echo "找不到 GitHub 发布工具：$GH_BIN"
  exit 1
fi

if [ ! -d .git ]; then
  git init -b main
fi

git add .

if ! git diff --cached --quiet; then
  git commit -m "发布小马宝莉卡片图鉴"
fi

if ! git remote get-url origin >/dev/null 2>&1; then
  if "$GH_BIN" repo view "$REPOSITORY" >/dev/null 2>&1; then
    git remote add origin "https://github.com/$REPOSITORY.git"
  else
    "$GH_BIN" repo create "$REPOSITORY" --public --source=. --remote=origin
  fi
fi

if ! "$GH_BIN" api "repos/$REPOSITORY/pages" >/dev/null 2>&1; then
  "$GH_BIN" api --method POST "repos/$REPOSITORY/pages" -f build_type=workflow >/dev/null
else
  "$GH_BIN" api --method PUT "repos/$REPOSITORY/pages" -f build_type=workflow >/dev/null
fi

git push -u origin main

echo
echo "发布已提交。GitHub 正在生成网站："
echo "https://alaodd-lang.github.io/mlp-card-picker/"
