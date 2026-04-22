"use client";

import { useState } from "react";
import { LoadStatus } from "../types";
import { INDEX_COL } from "./ExcelColumnPanel";

type Props = {
  dbColumns: string[];
  mappings: Record<string, string>;
  fixedValues: Record<string, string>;
  dbColLabels: Record<string, string>;
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
  onDbColLabelChange: (colName: string, label: string) => void;
  requiredCols: Set<string>;
  onToggleRequired: (colName: string) => void;
};

export default function DbColumnPanel({
  dbColumns,
  mappings,
  fixedValues,
  dbColLabels,
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
  onDbColLabelChange,
  requiredCols,
  onToggleRequired,
}: Props) {
  const isActiveDrag = !!draggedExcelCol;
  const [editingCol, setEditingCol] = useState<string | null>(null);
  const [editingValue, setEditingValue] = useState("");

  const commitLabel = (colName: string) => {
    onDbColLabelChange(colName, editingValue.trim());
    setEditingCol(null);
  };

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
              const label = dbColLabels[dbCol] ?? "";
              const isEditing = editingCol === dbCol;
              const isRequired = requiredCols.has(dbCol);

              return (
                <div
                  key={dbCol}
                  className="px-5 py-3 flex items-center gap-4 hover:bg-gray-50 transition-colors group"
                >
                  {/* DB column name + inline label editor */}
                  <div className="w-44 flex-shrink-0">
                    {isEditing ? (
                      <input
                        autoFocus
                        type="text"
                        value={editingValue}
                        onChange={(e) => setEditingValue(e.target.value)}
                        onBlur={() => commitLabel(dbCol)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") commitLabel(dbCol);
                          if (e.key === "Escape") setEditingCol(null);
                        }}
                        placeholder={dbCol}
                        className="w-full text-sm font-medium text-gray-700 border border-blue-400 rounded px-1.5 py-0.5 focus:outline-none focus:ring-1 focus:ring-blue-400"
                      />
                    ) : (
                      <div className="flex items-center gap-1">
                        <div className="min-w-0">
                          <span className={`block text-sm font-medium truncate ${label ? "text-gray-800" : "text-gray-500 font-mono"}`}>
                            {label || dbCol}
                          </span>
                          {label && (
                            <span className="block font-mono text-[10px] text-gray-400 truncate">{dbCol}</span>
                          )}
                        </div>
                        <button
                          type="button"
                          title="แก้ไขชื่อแสดง"
                          onClick={() => { setEditingCol(dbCol); setEditingValue(label); }}
                          className="opacity-0 group-hover:opacity-100 flex-shrink-0 text-blue-300 hover:text-blue-500 transition-opacity"
                        >
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                              d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                          </svg>
                        </button>
                      </div>
                    )}
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
                    onClick={() => onToggleRequired(dbCol)}
                    title={isRequired ? "ยกเลิก required" : "กำหนดให้ต้องมีค่า (required)"}
                    className={`flex-shrink-0 transition-colors ${isRequired ? "text-red-500 hover:text-red-300" : "text-gray-300 hover:text-red-400"}`}
                  >
                    <svg className="w-4 h-4" fill={isRequired ? "currentColor" : "none"} stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                        d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                    </svg>
                  </button>
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
