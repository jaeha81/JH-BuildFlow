/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,

  // Vercel 빌드 시 ESLint 오류로 배포 실패 방지 (CI에서 별도 검사)
  eslint: {
    ignoreDuringBuilds: true,
  },

  env: {
    NEXT_PUBLIC_APP_NAME: "JH BuildFlow 관리자",
  },
};

export default nextConfig;
