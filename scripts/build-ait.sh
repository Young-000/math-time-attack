#!/bin/bash
# .ait 빌드 및 버전 관리 스크립트

set -e

# 색상
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# package.json에서 버전 읽기
VERSION=$(node -p "require('./package.json').version")
APP_NAME="gugudan-challenge"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")

# builds 디렉토리 생성
BUILDS_DIR="builds"
mkdir -p "$BUILDS_DIR"

echo -e "${BLUE}📦 Building $APP_NAME v$VERSION...${NC}"

# granite 빌드 실행
npx granite build

# 빌드된 파일 확인
if [ ! -f "$APP_NAME.ait" ]; then
    echo "❌ Build failed: $APP_NAME.ait not found"
    exit 1
fi

# 버전 + 타임스탬프로 이름 변경
VERSIONED_NAME="${APP_NAME}-v${VERSION}-${TIMESTAMP}.ait"
mv "$APP_NAME.ait" "$BUILDS_DIR/$VERSIONED_NAME"

echo -e "${GREEN}✅ Build complete!${NC}"
echo ""
echo "📁 Output: $BUILDS_DIR/$VERSIONED_NAME"
echo "📏 Size: $(du -h "$BUILDS_DIR/$VERSIONED_NAME" | cut -f1)"
echo ""

# 최근 빌드 목록
echo "📋 Recent builds:"
ls -lht "$BUILDS_DIR"/*.ait 2>/dev/null | head -5 || echo "   (none)"
