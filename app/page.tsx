"use client";

import { useState, useRef, useCallback, useEffect, useMemo } from "react";
import * as XLSX from "xlsx";

type RowData = Record<string, string | number | boolean | null>;

const DEFAULT_COL_WIDTH = 150;
const MIN_COL_WIDTH = 60;
const SESSION_KEY = "xlsx_importer_auth";

export default function Home() {
  // ── Auth ──────────────────────────────────────────────────────────────────
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);
  const [loginUsername, setLoginUsername] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // ── Data ──────────────────────────────────────────────────────────────────
  const [data, setData] = useState<RowData[]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [fileName, setFileName] = useState<string>("");
  const [sheets, setSheets] = useState<string[]>([]);
  const [selectedSheet, setSelectedSheet] = useState<string>("");
  const [workbook, setWorkbook] = useState<XLSX.WorkBook | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string>("");
  const [currentPage, setCurrentPage] = useState(1);
  const [colWidths, setColWidths] = useState<Record<string, number>>({});
  const [hoveredResizeCol, setHoveredResizeCol] = useState<string | null>(null);
  const [resizingCol, setResizingCol] = useState<string | null>(null);

  const rowsPerPage = 20;
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Resize state stored in ref to avoid stale closures in event listeners
  const resizeRef = useRef<{
    col: string;
    startX: number;
    startWidth: number;
  } | null>(null);

  // ── Check session on mount ────────────────────────────────────────────────
  useEffect(() => {
    const stored = localStorage.getItem(SESSION_KEY);
    if (stored === "1") setIsAuthenticated(true);
    setAuthChecked(true);
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError("");
    setLoginLoading(true);
    try {
      const res = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: loginUsername, password: loginPassword }),
      });
      if (res.ok) {
        localStorage.setItem(SESSION_KEY, "1");
        setIsAuthenticated(true);
      } else {
        const json = await res.json();
        setLoginError(json.error ?? "เกิดข้อผิดพลาด");
      }
    } catch {
      setLoginError("ไม่สามารถเชื่อมต่อ server ได้");
    } finally {
      setLoginLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem(SESSION_KEY);
    setIsAuthenticated(false);
    setLoginUsername("");
    setLoginPassword("");
    setLoginError("");
  };

  // ── Global mousemove / mouseup for column resize ──────────────────────────
  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      if (!resizeRef.current) return;
      const { col, startX, startWidth } = resizeRef.current;
      const delta = e.clientX - startX;
      const newWidth = Math.max(MIN_COL_WIDTH, startWidth + delta);
      setColWidths((prev) => ({ ...prev, [col]: newWidth }));
    };

    const onMouseUp = () => {
      if (resizeRef.current) {
        setResizingCol(null);
        resizeRef.current = null;
      }
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };

    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };
  }, []);

  const startResize = (e: React.MouseEvent, col: string) => {
    e.preventDefault();
    e.stopPropagation();
    resizeRef.current = {
      col,
      startX: e.clientX,
      startWidth: colWidths[col] ?? DEFAULT_COL_WIDTH,
    };
    setResizingCol(col);
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
  };

  const parseSheet = useCallback(
    (wb: XLSX.WorkBook, sheetName: string) => {
      const ws = wb.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json<RowData>(ws, { defval: "" });
      if (jsonData.length > 0) {
        const hdrs = Object.keys(jsonData[0]);
        setHeaders(hdrs);
        setData(jsonData);
        // Reset column widths for new data
        setColWidths({});
      } else {
        setHeaders([]);
        setData([]);
        setColWidths({});
      }
      setCurrentPage(1);
    },
    []
  );

  const processFile = useCallback(
    (file: File) => {
      setError("");
      if (
        !file.name.endsWith(".xlsx") &&
        !file.name.endsWith(".xls") &&
        !file.name.endsWith(".csv")
      ) {
        setError("รองรับเฉพาะไฟล์ .xlsx, .xls, .csv เท่านั้น");
        return;
      }

      setFileName(file.name);
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const arrayBuffer = e.target?.result as ArrayBuffer;
          const wb = XLSX.read(arrayBuffer, { type: "array" });
          setWorkbook(wb);
          const sheetNames = wb.SheetNames;
          setSheets(sheetNames);
          setSelectedSheet(sheetNames[0]);
          parseSheet(wb, sheetNames[0]);
        } catch {
          setError("ไม่สามารถอ่านไฟล์ได้ กรุณาตรวจสอบรูปแบบไฟล์");
        }
      };
      reader.readAsArrayBuffer(file);
    },
    [parseSheet]
  );

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) processFile(file);
  };

  const handleSheetChange = (sheetName: string) => {
    setSelectedSheet(sheetName);
    if (workbook) parseSheet(workbook, sheetName);
  };

  const handleClear = () => {
    setData([]);
    setHeaders([]);
    setFileName("");
    setSheets([]);
    setSelectedSheet("");
    setWorkbook(null);
    setError("");
    setCurrentPage(1);
    setColWidths({});
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleExportJson = () => {
    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = fileName.replace(/\.[^.]+$/, "") + ".json";
    a.click();
    URL.revokeObjectURL(url);
  };

  const totalPages = Math.ceil(data.length / rowsPerPage);
  const pagedData = data.slice(
    (currentPage - 1) * rowsPerPage,
    currentPage * rowsPerPage
  );

  // Row background: alternating colors
  const rowBg = useMemo(
    () => (i: number) =>
      i % 2 === 0 ? "#ffffff" : "#f0f7ff",
    []
  );

  // ── Loading state (wait for localStorage check) ───────────────────────────
  if (!authChecked) return null;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ── Login Modal ─────────────────────────────────────────────────────── */}
      {!isAuthenticated && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center"
          style={{ background: "rgba(15,23,42,0.7)", backdropFilter: "blur(4px)" }}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl w-full max-w-sm mx-4 overflow-hidden"
            style={{ animation: "fadeInUp 0.25s ease" }}
          >
            {/* Modal header */}
            <div className="px-8 pt-8 pb-6 text-center">
              <div className="w-14 h-14 rounded-full bg-blue-100 flex items-center justify-center mx-auto mb-4">
                <svg className="w-7 h-7 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
              <h2 className="text-xl font-bold text-gray-900">เข้าสู่ระบบ</h2>
              <p className="text-sm text-gray-400 mt-1">กรุณาล็อกอินก่อนใช้งาน</p>
            </div>

            {/* Form */}
            <form onSubmit={handleLogin} className="px-8 pb-8 space-y-4">
              {/* Username */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  ชื่อผู้ใช้
                </label>
                <input
                  type="text"
                  value={loginUsername}
                  onChange={(e) => setLoginUsername(e.target.value)}
                  placeholder="กรอก username"
                  autoFocus
                  required
                  className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              {/* Password */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  รหัสผ่าน
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    placeholder="กรอก password"
                    required
                    className="w-full border border-gray-300 rounded-lg px-4 py-2.5 pr-11 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    tabIndex={-1}
                  >
                    {showPassword ? (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                          d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                      </svg>
                    ) : (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                          d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                          d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>

              {/* Error */}
              {loginError && (
                <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                  <svg className="w-4 h-4 text-red-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <p className="text-sm text-red-600">{loginError}</p>
                </div>
              )}

              {/* Submit */}
              <button
                type="submit"
                disabled={loginLoading}
                className="w-full py-2.5 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {loginLoading ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    กำลังตรวจสอบ...
                  </span>
                ) : "เข้าสู่ระบบ"}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-full mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Import Excel / Menu Items
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              อัปโหลดไฟล์ Excel เพื่อดูข้อมูลสินค้า
            </p>
          </div>
          {isAuthenticated && (
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              ออกจากระบบ
            </button>
          )}
        </div>
      </header>

      <main className="px-6 py-8">
        {/* Upload Zone */}
        {!data.length && (
          <div className="max-w-3xl mx-auto">
            <div
              className={`border-2 border-dashed rounded-xl p-12 text-center cursor-pointer transition-colors ${
                isDragging
                  ? "border-blue-500 bg-blue-50"
                  : "border-gray-300 bg-white hover:border-blue-400 hover:bg-blue-50"
              }`}
              onClick={() => fileInputRef.current?.click()}
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragging(true);
              }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
            >
              <div className="flex flex-col items-center gap-4">
                <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center">
                  <svg
                    className="w-8 h-8 text-blue-500"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                    />
                  </svg>
                </div>
                <div>
                  <p className="text-lg font-semibold text-gray-700">
                    ลากไฟล์มาวางที่นี่ หรือคลิกเพื่อเลือกไฟล์
                  </p>
                  <p className="text-sm text-gray-400 mt-1">
                    รองรับ .xlsx, .xls, .csv
                  </p>
                </div>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls,.csv"
                onChange={handleFileChange}
                className="hidden"
              />
            </div>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm max-w-3xl mx-auto">
            {error}
          </div>
        )}

        {/* File loaded state */}
        {data.length > 0 && (
          <>
            {/* Controls bar */}
            <div className="bg-white rounded-xl border border-gray-200 p-4 mb-4 flex flex-wrap items-center gap-4">
              {/* File info */}
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <svg
                  className="w-5 h-5 text-green-500"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <span className="font-medium text-gray-800">{fileName}</span>
                <span className="px-2 py-0.5 bg-gray-100 rounded-full text-xs">
                  {data.length.toLocaleString()} แถว
                </span>
                <span className="px-2 py-0.5 bg-gray-100 rounded-full text-xs">
                  {headers.length} คอลัมน์
                </span>
              </div>

              {/* Sheet selector */}
              {sheets.length > 1 && (
                <div className="flex items-center gap-2">
                  <label className="text-sm text-gray-600">Sheet:</label>
                  <select
                    value={selectedSheet}
                    onChange={(e) => handleSheetChange(e.target.value)}
                    className="text-sm border border-gray-300 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {sheets.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="ml-auto flex gap-2">
                <button
                  onClick={handleExportJson}
                  className="px-4 py-2 text-sm bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
                >
                  Export JSON
                </button>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="px-4 py-2 text-sm bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                >
                  เปลี่ยนไฟล์
                </button>
                <button
                  onClick={handleClear}
                  className="px-4 py-2 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  ล้างข้อมูล
                </button>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls,.csv"
                onChange={handleFileChange}
                className="hidden"
              />
            </div>

            {/* Data Table */}
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className="overflow-auto">
                <table
                  className="text-sm border-collapse"
                  style={{ tableLayout: "fixed", minWidth: "100%" }}
                >
                  <colgroup>
                    {/* Row number column */}
                    <col style={{ width: 48 }} />
                    {headers.map((h) => (
                      <col
                        key={h}
                        style={{ width: colWidths[h] ?? DEFAULT_COL_WIDTH }}
                      />
                    ))}
                  </colgroup>

                  <thead>
                    <tr style={{ background: "#f1f5f9", borderBottom: "2px solid #e2e8f0" }}>
                      {/* Row number header */}
                      <th className="px-3 py-3 text-left text-xs font-semibold text-gray-400 select-none">
                        #
                      </th>
                      {headers.map((h) => {
                        const isActive = hoveredResizeCol === h || resizingCol === h;
                        return (
                          <th
                            key={h}
                            className="relative px-3 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider select-none"
                            style={{ width: colWidths[h] ?? DEFAULT_COL_WIDTH }}
                          >
                            {/* Header text */}
                            <span className="block overflow-hidden text-ellipsis whitespace-nowrap pr-3">
                              {h}
                            </span>

                            {/* Resize zone — wider invisible hit area at right edge */}
                            <div
                              className="absolute top-0 right-0 h-full w-4 z-10 flex items-stretch justify-end"
                              style={{ cursor: "col-resize" }}
                              onMouseEnter={() => setHoveredResizeCol(h)}
                              onMouseLeave={() => setHoveredResizeCol(null)}
                              onMouseDown={(e) => startResize(e, h)}
                            >
                              {/* Visual divider line — always visible, turns blue on hover/drag */}
                              <div
                                style={{
                                  width: 3,
                                  height: "100%",
                                  background: isActive ? "#3b82f6" : "#cbd5e1",
                                  borderRadius: 2,
                                  transition: "background 0.15s",
                                }}
                              />
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
                        onMouseEnter={(e) => {
                          (e.currentTarget as HTMLTableRowElement).style.background = "#dbeafe";
                        }}
                        onMouseLeave={(e) => {
                          (e.currentTarget as HTMLTableRowElement).style.background = rowBg(i);
                        }}
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
                              padding: "10px 12px",
                              color: "#374151",
                              borderBottom: "1px solid #e2e8f0",
                              width: colWidths[h] ?? DEFAULT_COL_WIDTH,
                              maxWidth: colWidths[h] ?? DEFAULT_COL_WIDTH,
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap",
                            }}
                          >
                            {row[h] === "" || row[h] === null ? (
                              <span style={{ color: "#d1d5db" }}>—</span>
                            ) : (
                              String(row[h])
                            )}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="border-t border-gray-200 px-4 py-3 flex items-center justify-between">
                  <span className="text-sm text-gray-500">
                    แสดง {(currentPage - 1) * rowsPerPage + 1}–
                    {Math.min(currentPage * rowsPerPage, data.length)} จาก{" "}
                    {data.length.toLocaleString()} แถว
                  </span>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setCurrentPage(1)}
                      disabled={currentPage === 1}
                      className="px-2 py-1 text-sm rounded hover:bg-gray-100 disabled:opacity-30"
                    >
                      «
                    </button>
                    <button
                      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                      className="px-3 py-1 text-sm rounded hover:bg-gray-100 disabled:opacity-30"
                    >
                      ‹
                    </button>
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      let page: number;
                      if (totalPages <= 5) {
                        page = i + 1;
                      } else if (currentPage <= 3) {
                        page = i + 1;
                      } else if (currentPage >= totalPages - 2) {
                        page = totalPages - 4 + i;
                      } else {
                        page = currentPage - 2 + i;
                      }
                      return (
                        <button
                          key={page}
                          onClick={() => setCurrentPage(page)}
                          className={`px-3 py-1 text-sm rounded ${
                            currentPage === page
                              ? "bg-blue-500 text-white"
                              : "hover:bg-gray-100 text-gray-700"
                          }`}
                        >
                          {page}
                        </button>
                      );
                    })}
                    <button
                      onClick={() =>
                        setCurrentPage((p) => Math.min(totalPages, p + 1))
                      }
                      disabled={currentPage === totalPages}
                      className="px-3 py-1 text-sm rounded hover:bg-gray-100 disabled:opacity-30"
                    >
                      ›
                    </button>
                    <button
                      onClick={() => setCurrentPage(totalPages)}
                      disabled={currentPage === totalPages}
                      className="px-2 py-1 text-sm rounded hover:bg-gray-100 disabled:opacity-30"
                    >
                      »
                    </button>
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </main>
    </div>
  );
}
