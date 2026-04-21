"use client";

import { LoadStatus } from "../types";
import { INDEX_COL } from "./ExcelColumnPanel";

type Props = {
  dbColumns: string[];
  mappings: Record<string, string>;
  fixedValues: Record<string, string>;
  draggedExcelCol: string | null;
  dropOverCol: string | null;
  targetTable: string;
  loadColStatus: LoadStatus;
  loadColError: string;
  newDbColInput: string;
  onTargetTableChange: (value: string) => void;
  onLoadColumns: () => void;
  onNewDbColInputChange: (value: string) => void;
  onAddDbColumn: () => void;
  onRemoveDbColumn: (col: string) => void;
  onClearMapping: (dbCol: string) => void;
  onSetFixedValue: (dbCol: string, value: string) => void;
  onClearFixedValue: (dbCol: string) => void;
  onDropOverCol: (col: string | null) => void;
  onDrop: (dbCol: string) => void;
};

export default function DbColumnPanel({
  dbColumns,
  mappings,
  fixedValues,
  draggedExcelCol,
  dropOverCol,
  targetTable,
  loadColStatus,
  loadColError,
  newDbColInput,
  onTargetTableChange,
  onLoadColumns,
  onNewDbColInputChange,
  onAddDbColumn,
  onRemoveDbColumn,
  onClearMapping,
  onSetFixedValue,
  onClearFixedValue,
  onDropOverCol,
  onDrop,
}: Props) {
  const isActiveDrag = !!draggedExcelCol;

  return (
    <div className="flex-1">
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {/* Target table input */}
        <div className="px-5 py-4 border-b border-gray-100 bg-gray-50 flex items-center gap-3 flex-wrap">
          <h3 className="text-sm font-semibold text-gray-700 flex-shrink-0">Database Columns</h3>
          <div className="flex items-center gap-2 flex-1 flex-wrap">
            <span className="text-xs text-gray-400 flex-shrink-0">ตาราง:</span>
            <input
              type="text"
              value={targetTable}
              onChange={(e) => onTargetTableChange(e.target.value)}
              placeholder="table_name"
              className="border border-gray-300 rounded-lg px-3 py-1 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500 w-44"
            />
            <button
              onClick={onLoadColumns}
              disabled={!targetTable.trim() || loadColStatus === "loading"}
              className="flex items-center gap-1.5 px-3 py-1 text-xs font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              {loadColStatus === "loading" ? (
                <>
                  <svg className="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  กำลังโหลด...
                </>
              ) : (
                <>
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582 4 8 4" />
                  </svg>
                  โหลด Columns จาก DB
                </>
              )}
            </button>
            {loadColStatus === "error" && (
              <span className="text-xs text-red-500">{loadColError}</span>
            )}
          </div>
        </div>

        {/* Add column input */}
        <div className="px-5 py-3 border-b border-gray-100 flex items-center gap-2">
          <input
            type="text"
            value={newDbColInput}
            onChange={(e) => onNewDbColInputChange(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && onAddDbColumn()}
            placeholder="ชื่อ column ในฐานข้อมูล เช่น product_name"
            className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            onClick={onAddDbColumn}
            disabled={!newDbColInput.trim()}
            className="flex items-center gap-1.5 px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            เพิ่ม Column
          </button>
        </div>

        {/* Column list */}
        <div className="divide-y divide-gray-50">
          {dbColumns.length === 0 ? (
            <div className="px-5 py-16 text-center">
              <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-3">
                <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582 4 8 4s8-1.79 8-4" />
                </svg>
              </div>
              <p className="text-sm text-gray-500">ยังไม่มี column ในฐานข้อมูล</p>
              <p className="text-xs text-gray-400 mt-1">พิมพ์ชื่อ column แล้วกดปุ่ม เพิ่ม Column</p>
            </div>
          ) : (
            dbColumns.map((dbCol) => {
              const mappedFrom = mappings[dbCol];
              const fixedVal = fixedValues[dbCol] ?? "";
              const isOver = dropOverCol === dbCol;

              return (
                <div
                  key={dbCol}
                  className="px-5 py-3 flex items-center gap-4 hover:bg-gray-50 transition-colors"
                >
                  <div className="w-44 flex-shrink-0">
                    <span className="font-mono text-sm font-medium text-gray-700">{dbCol}</span>
                  </div>

                  <svg className="w-5 h-5 text-gray-300 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                  </svg>

                  <div
                    className="flex-1"
                    onDragOver={(e) => { e.preventDefault(); onDropOverCol(dbCol); }}
                    onDragLeave={() => onDropOverCol(null)}
                    onDrop={(e) => { e.preventDefault(); onDrop(dbCol); onDropOverCol(null); }}
                  >
                    {mappedFrom ? (
                      <div className="flex items-center gap-2 px-3 py-2 bg-green-50 border border-green-200 rounded-lg">
                        <svg className="w-3.5 h-3.5 text-green-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                        </svg>
                        <span className="font-mono text-sm text-green-700 font-medium flex-1 truncate">
                          {mappedFrom === INDEX_COL ? "running index" : mappedFrom}
                        </span>
                        <button
                          onClick={() => onClearMapping(dbCol)}
                          className="text-green-400 hover:text-red-500 transition-colors ml-1 flex-shrink-0"
                          title="ลบ mapping"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        {fixedVal === "" && (
                          <div
                            className="flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg border-2 border-dashed transition-all"
                            style={{
                              borderColor: isOver ? "#3b82f6" : isActiveDrag ? "#93c5fd" : "#e2e8f0",
                              background: isOver ? "#eff6ff" : isActiveDrag ? "#f8faff" : "transparent",
                            }}
                          >
                            <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"
                              style={{ color: isOver ? "#3b82f6" : "#cbd5e1" }}>
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                d="M19 13l-7 7-7-7m14-8l-7 7-7-7" />
                            </svg>
                            <span className="text-xs" style={{ color: isOver ? "#3b82f6" : "#94a3b8" }}>
                              {isOver ? "วางที่นี่" : "ลากคอลัมน์มาวาง"}
                            </span>
                          </div>
                        )}
                        {fixedVal === "" && (
                          <span className="text-xs text-gray-300 flex-shrink-0 select-none">หรือ</span>
                        )}
                        <div className={`flex items-center gap-1 ${fixedVal ? "flex-1" : "flex-shrink-0"}`}>
                          <input
                            type="text"
                            value={fixedVal}
                            onChange={(e) => onSetFixedValue(dbCol, e.target.value)}
                            placeholder="ค่าคงที่..."
                            onClick={(e) => e.stopPropagation()}
                            className={`rounded-lg px-2 py-2 text-xs font-mono focus:outline-none focus:ring-2 transition-colors ${
                              fixedVal
                                ? "w-full border border-amber-300 bg-amber-50 text-amber-700 focus:ring-amber-400 focus:border-amber-400"
                                : "w-28 border border-dashed border-gray-300 focus:ring-amber-400 focus:border-amber-400 placeholder:text-gray-300"
                            }`}
                          />
                          {fixedVal && (
                            <button
                              onClick={(e) => { e.stopPropagation(); onClearFixedValue(dbCol); }}
                              className="text-amber-400 hover:text-red-500 transition-colors flex-shrink-0"
                              title="ลบค่าคงที่"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                              </svg>
                            </button>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  <button
                    onClick={() => onRemoveDbColumn(dbCol)}
                    className="text-gray-300 hover:text-red-400 transition-colors flex-shrink-0"
                    title="ลบ column นี้"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
