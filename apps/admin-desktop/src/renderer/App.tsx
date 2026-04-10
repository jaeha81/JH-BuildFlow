import { useState } from "react";

export function App() {
  const [isLoading] = useState(true);

  return (
    <div className="min-h-screen bg-gray-950 text-white flex items-center justify-center">
      {isLoading ? (
        <div className="text-center space-y-4">
          <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-lg font-medium text-gray-300">
            관리자 대시보드 로딩 중
          </p>
          <p className="text-sm text-gray-500">
            Interior Contractor Platform v0.1.0
          </p>
        </div>
      ) : (
        <div>
          <h1 className="text-2xl font-bold">관리자 대시보드</h1>
        </div>
      )}
    </div>
  );
}
