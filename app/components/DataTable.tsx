"use client";

import { useMemo } from "react";
import { RowData } from "../types";

const DEFAULT_COL_WIDTH = 150;
const MIN_COL_WIDTH = 60;

type Props = {
  data: RowData[];
  headers: string[];
  currentPage: number;
  rowsPerPage: number;
  colWidths: Record<string, number>;
  resizingCol: string | null;
  hoveredResizeCol: string | null;
  onPageChange: (page: number) => void;
  onStartResize: (e: React.MouseEvent, col: string) => void;
  onHoverResizeCol: (col: string | null) => void;
};

export { DEFAULT_COL_WIDTH, MIN_COL_WIDTH };

export default function DataTable({
  data,
  headers,
  currentPage,
  rowsPerPage,
  colWidths,
  resizingCol,
  hoveredResizeCol,
  onPageChange,
  onStartResize,
  onHoverResizeCol,
}: Props) {
  const totalPages = Math.ceil(data.length / rowsPerPage);
  const pagedData = data.slice((currentPage - 1) * rowsPerPage, currentPage * rowsPerPage);
  const rowBg = useMemo(() => (i: number) => i % 2 === 0 ? "#ffffff" : "#f0f7ff", []);

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <div className="overflow-auto">
        <table className="text-sm border-collapse" style={{ tableLayout: "fixed", minWidth: "100%" }}>
          <colgroup>
            <col style={{ width: 48 }} />
            {headers.map((h) => (
              <col key={h} style={{ width: colWidths[h] ?? DEFAULT_COL_WIDTH }} />
            ))}
          </colgroup>
          <thead>
            <tr style={{ background: "#f1f5f9", borderBottom: "2px solid #e2e8f0" }}>
              <th className="px-3 py-3 text-left text-xs font-semibold text-gray-400 select-none">#</th>
              {headers.map((h) => {
                const isActive = hoveredResizeCol === h || resizingCol === h;
                return (
                  <th
                    key={h}
                    className="relative px-3 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider select-none"
                    style={{ width: colWidths[h] ?? DEFAULT_COL_WIDTH }}
                  >
                    <span className="block overflow-hidden text-ellipsis whitespace-nowrap pr-3">{h}</span>
                    <div
                      className="absolute top-0 right-0 h-full w-4 z-10 flex items-stretch justify-end"
                      style={{ cursor: "col-resize" }}
                      onMouseEnter={() => onHoverResizeCol(h)}
                      onMouseLeave={() => onHoverResizeCol(null)}
                      onMouseDown={(e) => onStartResize(e, h)}
                    >
                      <div style={{
                        width: 3, height: "100%",
                        background: isActive ? "#3b82f6" : "#cbd5e1",
                        borderRadius: 2, transition: "background 0.15s",
                      }} />
                    </div>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {pagedData.map((row, i) => (
              <tr
                key={i}
                style={{ background: rowBg(i) }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLTableRowElement).style.background = "#dbeafe"; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLTableRowElement).style.background = rowBg(i); }}
              >
                <td
                  className="px-3 py-2.5 text-xs select-none"
                  style={{ color: "#94a3b8", borderBottom: "1px solid #e2e8f0" }}
                >
                  {(currentPage - 1) * rowsPerPage + i + 1}
                </td>
                {headers.map((h) => (
                  <td
                    key={h}
                    title={String(row[h] ?? "")}
                    style={{
                      padding: "10px 12px", color: "#374151",
                      borderBottom: "1px solid #e2e8f0",
                      width: colWidths[h] ?? DEFAULT_COL_WIDTH,
                      maxWidth: colWidths[h] ?? DEFAULT_COL_WIDTH,
                      overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                    }}
                  >
                    {row[h] === "" || row[h] === null
                      ? <span style={{ color: "#d1d5db" }}>—</span>
                      : String(row[h])}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="border-t border-gray-200 px-4 py-3 flex items-center justify-between">
          <span className="text-sm text-gray-500">
            แสดง {(currentPage - 1) * rowsPerPage + 1}–{Math.min(currentPage * rowsPerPage, data.length)} จาก {data.length.toLocaleString()} แถว
          </span>
          <div className="flex items-center gap-1">
            {[
              { label: "«", action: () => onPageChange(1), disabled: currentPage === 1 },
              { label: "‹", action: () => onPageChange(Math.max(1, currentPage - 1)), disabled: currentPage === 1 },
            ].map((btn) => (
              <button key={btn.label} onClick={btn.action} disabled={btn.disabled}
                className="px-2 py-1 text-sm rounded hover:bg-gray-100 disabled:opacity-30">{btn.label}</button>
            ))}
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              let page: number;
              if (totalPages <= 5) page = i + 1;
              else if (currentPage <= 3) page = i + 1;
              else if (currentPage >= totalPages - 2) page = totalPages - 4 + i;
              else page = currentPage - 2 + i;
              return (
                <button key={page} onClick={() => onPageChange(page)}
                  className={`px-3 py-1 text-sm rounded ${currentPage === page ? "bg-blue-500 text-white" : "hover:bg-gray-100 text-gray-700"}`}>
                  {page}
                </button>
              );
            })}
            {[
              { label: "›", action: () => onPageChange(Math.min(totalPages, currentPage + 1)), disabled: currentPage === totalPages },
              { label: "»", action: () => onPageChange(totalPages), disabled: currentPage === totalPages },
            ].map((btn) => (
              <button key={btn.label} onClick={btn.action} disabled={btn.disabled}
                className="px-2 py-1 text-sm rounded hover:bg-gray-100 disabled:opacity-30">{btn.label}</button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
