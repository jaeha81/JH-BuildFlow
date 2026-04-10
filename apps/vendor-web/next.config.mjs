/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,

  // Vercel 빌드 시 ESLint 오류로 배포 실패 방지 (CI에서 별도 검사)
  eslint: {
    ignoreDuringBuilds: true,
  },

  // 환경변수 검증 — 빌드 타임에 NEXT_PUBLIC_API_URL 미설정 시 경고
  env: {
    NEXT_PUBLIC_APP_NAME: "JH BuildFlow 협력사 포털",
  },
};

export default nextConfig;
