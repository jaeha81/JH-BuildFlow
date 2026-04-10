import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig(({ mode }) => {
  // .env 파일 및 환경변수 로드
  const env = loadEnv(mode, process.cwd(), "");

  return {
    plugins: [react()],
    resolve: {
      alias: {
        "@shared": path.resolve(__dirname, "src/shared"),
      },
    },
    server: {
      port: 5173,
    },
    build: {
      outDir: "dist/renderer",
    },
    define: {
      // 개발: http://localhost:8000 / 프로덕션: VITE_API_BASE_URL 환경변수
      "import.meta.env.VITE_API_URL": JSON.stringify(
        env.VITE_API_BASE_URL || (mode === "production" ? "" : "http://localhost:8000")
      ),
      // 앱 이름 화이트라벨
      "import.meta.env.VITE_APP_NAME": JSON.stringify(
        env.APP_PRODUCT_NAME || "JH BuildFlow 관리자"
      ),
    },
  };
});
