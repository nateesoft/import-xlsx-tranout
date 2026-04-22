"use client";

import { MySqlConfig, SaveDbStatus } from "../types";

type SaveDbResult = { total: number; success: number; error: string | null };

type Props = {
  dataLength: number;
  mappedDbCount: number;
  targetTable: string;
  headerTable: string;
  docNo: string;
  docDate: string;
  branchCode: string;
  mysqlConnected: boolean;
  mysqlConfig: MySqlConfig;
  saveDbStatus: SaveDbStatus;
  saveDbResult: SaveDbResult;
  onSave: () => void;
  onClose: () => void;
  onRetry: () => void;
  onSuccess?: () => void;
};

export default function SaveToDbModal({
  dataLength,
  mappedDbCount,
  targetTable,
  headerTable,
  docNo,
  docDate,
  branchCode,
  mysqlConnected,
  mysqlConfig,
  saveDbStatus,
  saveDbResult,
  onSave,
  onClose,
  onRetry,
  onSuccess,
}: Props) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: "rgba(15,23,42,0.55)", backdropFilter: "blur(3px)" }}
      onClick={() => { if (saveDbStatus !== "loading") onClose(); }}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 p-6"
        style={{ animation: "fadeInUp 0.2s ease" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
            <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582 4 8 4" />
            </svg>
          </div>
          <div>
            <h3 className="text-base font-semibold text-gray-900">บันทึกลงฐานข้อมูล</h3>
            <p className="text-xs text-gray-400">
              {dataLength.toLocaleString()} แถว · {mappedDbCount} columns mapped
              {targetTable && <> · detail: <span className="font-mono">{targetTable}</span></>}
              {headerTable && <> · header: <span className="font-mono">{headerTable}</span></>}
            </p>
          </div>
        </div>

        {saveDbStatus === "idle" && (
          <>
            {mysqlConnected && mysqlConfig ? (
              <div className="mb-4 flex items-center gap-2 px-3 py-2.5 bg-green-50 border border-green-200 rounded-lg">
                <span className="w-2 h-2 rounded-full bg-green-500 flex-shrink-0" />
                <span className="text-sm text-green-800 font-medium">
                  {mysqlConfig.database}@{mysqlConfig.host}:{mysqlConfig.port}
                </span>
              </div>
            ) : (
              <div className="mb-4 flex items-center gap-2 px-3 py-2.5 bg-red-50 border border-red-200 rounded-lg">
                <span className="w-2 h-2 rounded-full bg-red-400 flex-shrink-0" />
                <span className="text-sm text-red-700">กรุณาเชื่อมต่อ MySQL ก่อนบันทึก</span>
              </div>
            )}

            <div className="bg-gray-50 rounded-lg p-3 mb-4 text-xs text-gray-600 space-y-1.5 border border-gray-100">
              {(headerTable || docNo || docDate || branchCode) && (
                <div className="pb-1.5 border-b border-gray-200">
                  <p className="text-[10px] font-semibold text-amber-600 uppercase tracking-wide mb-1">Header</p>
                  {headerTable && (
                    <div className="flex justify-between">
                      <span>ตาราง</span>
                      <span className="font-mono font-semibold text-gray-800">{headerTable}</span>
                    </div>
                  )}
                  {docNo && <div className="flex justify-between"><span>เลขที่เอกสาร</span><span className="font-semibold text-gray-800">{docNo}</span></div>}
                  {docDate && <div className="flex justify-between"><span>วันที่</span><span className="font-semibold text-gray-800">{docDate}</span></div>}
                  {branchCode && <div className="flex justify-between"><span>รหัสสาขา</span><span className="font-semibold text-gray-800">{branchCode}</span></div>}
                </div>
              )}
              <div>
                <p className="text-[10px] font-semibold text-blue-600 uppercase tracking-wide mb-1">Detail</p>
                <div className="flex justify-between">
                  <span>จำนวนแถว</span>
                  <span className="font-semibold text-gray-800">{dataLength.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span>Columns ที่ map แล้ว</span>
                  <span className="font-semibold text-gray-800">{mappedDbCount}</span>
                </div>
                {targetTable && (
                  <div className="flex justify-between">
                    <span>ตาราง</span>
                    <span className="font-mono font-semibold text-gray-800">{targetTable}</span>
                  </div>
                )}
              </div>
            </div>

            <div className="flex gap-2 justify-end">
              <button onClick={onClose}
                className="px-4 py-2 text-sm bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200">
                ยกเลิก
              </button>
              <button
                onClick={onSave}
                disabled={!mysqlConnected}
                className="flex items-center gap-1.5 px-5 py-2 text-sm bg-green-600 text-white font-medium rounded-lg hover:bg-green-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                บันทึก
              </button>
            </div>
          </>
        )}

        {saveDbStatus === "loading" && (
          <div className="py-8 flex flex-col items-center gap-3">
            <svg className="w-8 h-8 text-green-500 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            <p className="text-sm text-gray-600">กำลังบันทึกข้อมูล {dataLength.toLocaleString()} แถว...</p>
          </div>
        )}

        {saveDbStatus === "success" && (
          <div className="py-6 flex flex-col items-center gap-3 text-center">
            <div className="w-14 h-14 rounded-full bg-green-100 flex items-center justify-center">
              <svg className="w-7 h-7 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <div>
              <p className="text-base font-semibold text-gray-900">บันทึกสำเร็จ</p>
              <p className="text-sm text-gray-500 mt-1">
                บันทึก <span className="font-semibold text-green-600">{saveDbResult.success.toLocaleString()}</span> แถว เข้าฐานข้อมูลเรียบร้อย
              </p>
            </div>
            <button onClick={onSuccess ?? onClose}
              className="mt-2 px-6 py-2 text-sm bg-green-600 text-white font-medium rounded-lg hover:bg-green-700">
              ปิด
            </button>
          </div>
        )}

        {saveDbStatus === "error" && (
          <div className="py-4 flex flex-col items-center gap-3 text-center">
            <div className="w-14 h-14 rounded-full bg-red-100 flex items-center justify-center">
              <svg className="w-7 h-7 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <p className="text-base font-semibold text-gray-900">เกิดข้อผิดพลาด</p>
              <p className="text-sm text-red-600 mt-1 break-all">{saveDbResult.error}</p>
            </div>
            <div className="flex gap-2 mt-1">
              <button onClick={onClose}
                className="px-4 py-2 text-sm bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200">
                ปิด
              </button>
              <button onClick={onRetry}
                className="px-4 py-2 text-sm bg-red-500 text-white rounded-lg hover:bg-red-600">
                ลองใหม่
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
