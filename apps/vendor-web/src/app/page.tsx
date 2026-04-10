export default function HomePage() {
  return (
    <main className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center space-y-4">
        <h1 className="text-3xl font-bold text-gray-900">협력사 포털</h1>
        <p className="text-gray-500">
          JH BuildFlow — 인테리어 공사 협력사 발주·견적·정산 플랫폼
        </p>
        <div className="flex gap-3 justify-center mt-6">
          <a
            href="/login"
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            로그인
          </a>
          <a
            href="/join"
            className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors"
          >
            협력사 가입
          </a>
        </div>
      </div>
    </main>
  );
}
