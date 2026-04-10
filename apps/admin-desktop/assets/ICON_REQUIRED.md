# 아이콘 파일 요구사항

`assets/icon.png` — 512×512 PNG 파일이 필요합니다.

electron-builder가 자동으로 ICO 변환합니다.

## 빌드 전 준비

1. 512×512 PNG를 `assets/icon.png`로 배치
2. 화이트라벨 시 `APP_PRODUCT_NAME` 환경변수 설정
3. `npm run electron:build` 실행

## 참고

- NSIS 설치 파일: `dist/JH BuildFlow 관리자 Setup.exe` → `setup.exe`
- 포터블 실행 파일: `dist/portable.exe`
