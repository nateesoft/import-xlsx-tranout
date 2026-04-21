"use client";

import { useState } from "react";
import { ColDef, LoadStatus } from "../types";
import { mysqlTypeToInputType } from "../lib/mysqlType";

type Props = {
  headerTable: string;
  headerColDefs: ColDef[];
  headerColStatus: LoadStatus;
  headerColError: string;
  headerFieldValues: Record<string, string>;
  headerColLabels: Record<string, string>;
  docNo: string;
  docDate: string;
  branchCode: string;
  onHeaderTableChange: (value: string) => void;
  onLoadHeaderColumns: () => void;
  onHeaderFieldChange: (col: string, value: string) => void;
  onHeaderColLabelChange: (colName: string, label: string) => void;
  onDocNoChange: (v: string) => void;
  onDocDateChange: (v: string) => void;
  onBranchCodeChange: (v: string) => void;
};

export default function HeaderTableCard({
  headerTable,
  headerColDefs,
  headerColStatus,
  headerColError,
  headerFieldValues,
  headerColLabels,
  docNo,
  docDate,
  branchCode,
  onHeaderTableChange,
  onLoadHeaderColumns,
  onHeaderFieldChange,
  onHeaderColLabelChange,
  onDocNoChange,
  onDocDateChange,
  onBranchCodeChange,
}: Props) {
  const [editingCol, setEditingCol] = useState<string | null>(null);
  const [editingValue, setEditingValue] = useState("");
  return (
    <div className="bg-white rounded-xl border border-gray-200 mb-3 overflow-hidden">
      <div className="px-5 py-3 border-b border-gray-100 bg-amber-50 flex items-center gap-2">
        <svg className="w-4 h-4 text-amber-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
        <h4 className="text-sm font-semibold text-amber-800">ข้อมูล Header</h4>
        <span className="text-xs text-amber-600">ข้อมูลระดับเอกสารที่บันทึกใน header table</span>
      </div>

      <div className="px-5 py-4 flex flex-wrap gap-4 items-end">
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">ตาราง Header</label>
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={headerTable}
              onChange={(e) => onHeaderTableChange(e.target.value)}
              placeholder="header_table"
              className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-amber-400 w-40"
            />
            <button
              onClick={onLoadHeaderColumns}
              disabled={!headerTable.trim() || headerColStatus === "loading"}
              className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium bg-amber-500 text-white rounded-lg hover:bg-amber-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              {headerColStatus === "loading" ? (
                <svg className="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              ) : (
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
              )}
              โหลด
            </button>
          </div>
          {headerColStatus === "error" && (
            <p className="text-xs text-red-500 mt-1">{headerColError}</p>
          )}
        </div>

        {headerColDefs.length === 0 && (
          <>
            <div className="w-px h-8 bg-gray-200 self-center" />
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                เลขที่เอกสาร <span className="text-gray-400 font-normal">(doc_no)</span>
              </label>
              <input
                type="text"
                value={docNo}
                onChange={(e) => onDocNoChange(e.target.value)}
                placeholder="DOC-0001"
                className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 w-36"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                วันที่ <span className="text-gray-400 font-normal">(date)</span>
              </label>
              <input
                type="date"
                value={docDate}
                onChange={(e) => onDocDateChange(e.target.value)}
                className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 w-40"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                รหัสสาขา <span className="text-gray-400 font-normal">(branch_code)</span>
              </label>
              <input
                type="text"
                value={branchCode}
                onChange={(e) => onBranchCodeChange(e.target.value)}
                placeholder="BKK01"
                className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 w-28"
              />
            </div>
          </>
        )}
      </div>

      {headerColDefs.length > 0 && (
        <div className="mx-5 mb-4 border border-amber-200 rounded-xl bg-amber-50/60 overflow-hidden">
          <div className="px-4 py-2 border-b border-amber-200 bg-amber-100/70 flex items-center gap-2">
            <svg className="w-3.5 h-3.5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
            <span className="text-xs font-semibold text-amber-800">กรอกข้อมูล Header</span>
            <span className="text-xs text-amber-600 font-mono ml-1">({headerTable})</span>
          </div>
          <div className="px-4 py-4 flex flex-wrap gap-4">
            {headerColDefs.map((col) => {
              const inputType = mysqlTypeToInputType(col.type);
              const label = headerColLabels[col.name] || "";
              const isEditing = editingCol === col.name;

              const commitLabel = () => {
                onHeaderColLabelChange(col.name, editingValue.trim());
                setEditingCol(null);
              };

              return (
                <div key={col.name}>
                  {/* Label row with edit toggle */}
                  <div className="flex items-center gap-1 mb-1 group">
                    {isEditing ? (
                      <input
                        autoFocus
                        type="text"
                        value={editingValue}
                        onChange={(e) => setEditingValue(e.target.value)}
                        onBlur={commitLabel}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") commitLabel();
                          if (e.key === "Escape") setEditingCol(null);
                        }}
                        placeholder={col.name}
                        className="text-xs font-medium text-gray-700 border border-amber-400 rounded px-1.5 py-0.5 focus:outline-none focus:ring-1 focus:ring-amber-400 w-32"
                      />
                    ) : (
                      <span className="text-xs font-medium text-gray-700">
                        {label || col.name}
                      </span>
                    )}

                    {!isEditing && (
                      <button
                        type="button"
                        title="แก้ไขชื่อแสดง"
                        onClick={() => { setEditingCol(col.name); setEditingValue(label); }}
                        className="opacity-0 group-hover:opacity-100 text-amber-400 hover:text-amber-600 transition-opacity"
                      >
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                            d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                        </svg>
                      </button>
                    )}

                    {/* แสดงชื่อ DB จริงเป็น tooltip เมื่อมี label */}
                    {label && !isEditing && (
                      <span className="text-gray-400 font-normal font-mono text-[10px]">({col.name})</span>
                    )}
                  </div>

                  <input
                    type={inputType}
                    value={headerFieldValues[col.name] ?? ""}
                    onChange={(e) => onHeaderFieldChange(col.name, e.target.value)}
                    step={inputType === "number" ? "any" : undefined}
                    className="border border-amber-300 bg-white rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 w-40"
                  />
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
