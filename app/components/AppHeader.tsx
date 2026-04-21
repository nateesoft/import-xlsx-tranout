"use client";

import { RowData, MySqlConfig } from "../types";

type Props = {
  data: RowData[];
  step: "import" | "mapping";
  mysqlConnected: boolean;
  mysqlConfig: MySqlConfig;
  isAuthenticated: boolean;
  onOpenMysqlModal: () => void;
  onLogout: () => void;
};

export default function AppHeader({
  data,
  step,
  mysqlConnected,
  mysqlConfig,
  isAuthenticated,
  onOpenMysqlModal,
  onLogout,
}: Props) {
  return (
    <header className="app-drag bg-white border-b border-gray-200 px-6 py-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Import Excel / Menu Items</h1>
            <p className="text-sm text-gray-500 mt-0.5">อัปโหลดไฟล์ Excel เพื่อดูข้อมูลสินค้า</p>
          </div>

          {data.length > 0 && (
            <div className="flex items-center gap-2 ml-4">
              <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium ${
                step === "import" ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-500"
              }`}>
                <span className={`w-4 h-4 rounded-full flex items-center justify-center text-xs font-bold ${
                  step === "import" ? "bg-white text-blue-600" : "bg-gray-300 text-white"
                }`}>1</span>
                Import Data
              </div>
              <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
              <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium ${
                step === "mapping" ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-500"
              }`}>
                <span className={`w-4 h-4 rounded-full flex items-center justify-center text-xs font-bold ${
                  step === "mapping" ? "bg-white text-blue-600" : "bg-gray-300 text-white"
                }`}>2</span>
                Column Mapping
              </div>
            </div>
          )}
        </div>

        {isAuthenticated && (
          <div className="app-no-drag flex items-center gap-2">
            <button
              onClick={onOpenMysqlModal}
              className="flex items-center gap-2 px-3 py-2 text-sm border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
              title="MySQL Connection"
            >
              <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582 4 8 4" />
              </svg>
              <span className="text-gray-600">MySQL</span>
              <span className={`w-2 h-2 rounded-full ${mysqlConnected ? "bg-green-500" : "bg-gray-300"}`} />
            </button>

            <button
              onClick={onLogout}
              className="flex items-center gap-2 px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              ออกจากระบบ
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
