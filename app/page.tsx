"use client";

import { useState, useRef, useCallback, useEffect, useMemo } from "react";
import * as XLSX from "xlsx";

type RowData = Record<string, string | number | boolean | null>;

type MappingTemplate = {
  id: string;
  name: string;
  headersKey: string;
  targetTable: string;
  dbColumns: string[];
  mappings: Record<string, string>;
  createdAt: number;
};

const DEFAULT_COL_WIDTH = 150;
const MIN_COL_WIDTH = 60;
const SESSION_KEY = "xlsx_importer_auth";
const TEMPLATES_KEY = "xlsx_mapping_templates";
const API_URL_KEY = "xlsx_api_url";

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

  // ── Step & Mapping ────────────────────────────────────────────────────────
  const [step, setStep] = useState<"import" | "mapping">("import");
  const [targetTable, setTargetTable] = useState("");
  const [dbColumns, setDbColumns] = useState<string[]>([]);
  const [newDbColInput, setNewDbColInput] = useState("");
  // mappings: dbCol → excelCol
  const [mappings, setMappings] = useState<Record<string, string>>({});
  const [draggedExcelCol, setDraggedExcelCol] = useState<string | null>(null);
  const [dropOverCol, setDropOverCol] = useState<string | null>(null);

  // ── Templates ─────────────────────────────────────────────────────────────
  const [templates, setTemplates] = useState<MappingTemplate[]>([]);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [templateName, setTemplateName] = useState("");
  const [showTemplatePanel, setShowTemplatePanel] = useState(false);

  // ── Save to DB ────────────────────────────────────────────────────────────
  const [apiUrl, setApiUrl] = useState("");
  const [showSaveDbModal, setShowSaveDbModal] = useState(false);
  const [saveDbStatus, setSaveDbStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [saveDbResult, setSaveDbResult] = useState<{ total: number; success: number; error: string | null }>({ total: 0, success: 0, error: null });

  const rowsPerPage = 20;
  const fileInputRef = useRef<HTMLInputElement>(null);
  const resizeRef = useRef<{
    col: string;
    startX: number;
    startWidth: number;
  } | null>(null);

  // ── Session + templates on mount ─────────────────────────────────────────
  useEffect(() => {
    const stored = localStorage.getItem(SESSION_KEY);
    if (stored === "1") setIsAuthenticated(true);
    setAuthChecked(true);
    try {
      const tpls = localStorage.getItem(TEMPLATES_KEY);
      if (tpls) setTemplates(JSON.parse(tpls));
    } catch {}
    const savedUrl = localStorage.getItem(API_URL_KEY);
    if (savedUrl) setApiUrl(savedUrl);
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

  // ── Column resize ─────────────────────────────────────────────────────────
  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      if (!resizeRef.current) return;
      const { col, startX, startWidth } = resizeRef.current;
      const delta = e.clientX - startX;
      setColWidths((prev) => ({
        ...prev,
        [col]: Math.max(MIN_COL_WIDTH, startWidth + delta),
      }));
    };
    const onMouseUp = () => {
      if (resizeRef.current) { setResizingCol(null); resizeRef.current = null; }
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
    resizeRef.current = { col, startX: e.clientX, startWidth: colWidths[col] ?? DEFAULT_COL_WIDTH };
    setResizingCol(col);
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
  };

  // ── File parsing ──────────────────────────────────────────────────────────
  const parseSheet = useCallback((wb: XLSX.WorkBook, sheetName: string) => {
    const ws = wb.Sheets[sheetName];
    const jsonData = XLSX.utils.sheet_to_json<RowData>(ws, { defval: "" });
    if (jsonData.length > 0) {
      setHeaders(Object.keys(jsonData[0]));
      setData(jsonData);
    } else {
      setHeaders([]);
      setData([]);
    }
    setColWidths({});
    setCurrentPage(1);
  }, []);

  const processFile = useCallback((file: File) => {
    setError("");
    if (!file.name.endsWith(".xlsx") && !file.name.endsWith(".xls") && !file.name.endsWith(".csv")) {
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
        setSheets(wb.SheetNames);
        setSelectedSheet(wb.SheetNames[0]);
        parseSheet(wb, wb.SheetNames[0]);
      } catch {
        setError("ไม่สามารถอ่านไฟล์ได้ กรุณาตรวจสอบรูปแบบไฟล์");
      }
    };
    reader.readAsArrayBuffer(file);
  }, [parseSheet]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  };

  const handleFileDrop = (e: React.DragEvent) => {
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
    setData([]); setHeaders([]); setFileName(""); setSheets([]);
    setSelectedSheet(""); setWorkbook(null); setError("");
    setCurrentPage(1); setColWidths({}); setStep("import");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleExportJson = () => {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = fileName.replace(/\.[^.]+$/, "") + ".json";
    a.click();
    URL.revokeObjectURL(url);
  };

  // ── Mapping handlers ──────────────────────────────────────────────────────
  const addDbColumn = () => {
    const trimmed = newDbColInput.trim();
    if (!trimmed || dbColumns.includes(trimmed)) return;
    setDbColumns((prev) => [...prev, trimmed]);
    setNewDbColInput("");
  };

  const removeDbColumn = (col: string) => {
    setDbColumns((prev) => prev.filter((c) => c !== col));
    setMappings((prev) => {
      const next = { ...prev };
      delete next[col];
      return next;
    });
  };

  const clearMapping = (dbCol: string) => {
    setMappings((prev) => {
      const next = { ...prev };
      delete next[dbCol];
      return next;
    });
  };

  const handleSaveToDb = async () => {
    if (!apiUrl.trim()) return;
    localStorage.setItem(API_URL_KEY, apiUrl.trim());

    // Transform: apply mappings — produce array of { dbCol: value }
    const transformed = data.map((row) => {
      const result: RowData = {};
      for (const [dbCol, excelCol] of Object.entries(mappings)) {
        result[dbCol] = row[excelCol] ?? null;
      }
      return result;
    });

    setSaveDbStatus("loading");
    setSaveDbResult({ total: transformed.length, success: 0, error: null });

    try {
      const res = await fetch(apiUrl.trim(), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ table: targetTable, data: transformed }),
      });
      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        setSaveDbStatus("error");
        setSaveDbResult({
          total: transformed.length,
          success: 0,
          error: (errJson as Record<string, string>).message ?? (errJson as Record<string, string>).error ?? `HTTP ${res.status}`,
        });
      } else {
        const json = await res.json().catch(() => ({}));
        setSaveDbStatus("success");
        setSaveDbResult({
          total: transformed.length,
          success: (json as Record<string, number>).inserted ?? transformed.length,
          error: null,
        });
      }
    } catch (err: unknown) {
      setSaveDbStatus("error");
      setSaveDbResult({
        total: transformed.length,
        success: 0,
        error: err instanceof Error ? err.message : "ไม่สามารถเชื่อมต่อได้",
      });
    }
  };

  // ── Template handlers ─────────────────────────────────────────────────────
  const saveTemplate = () => {
    const name = templateName.trim();
    if (!name) return;
    const tpl: MappingTemplate = {
      id: Date.now().toString(),
      name,
      headersKey: headers.join("|"),
      targetTable,
      dbColumns: [...dbColumns],
      mappings: { ...mappings },
      createdAt: Date.now(),
    };
    const updated = [...templates, tpl];
    setTemplates(updated);
    localStorage.setItem(TEMPLATES_KEY, JSON.stringify(updated));
    setShowSaveModal(false);
    setTemplateName("");
  };

  const loadTemplate = (tpl: MappingTemplate) => {
    setTargetTable(tpl.targetTable);
    setDbColumns([...tpl.dbColumns]);
    setMappings({ ...tpl.mappings });
    setShowTemplatePanel(false);
  };

  const deleteTemplate = (id: string) => {
    const updated = templates.filter((t) => t.id !== id);
    setTemplates(updated);
    localStorage.setItem(TEMPLATES_KEY, JSON.stringify(updated));
  };

  // ── Derived ───────────────────────────────────────────────────────────────
  const totalPages = Math.ceil(data.length / rowsPerPage);
  const pagedData = data.slice((currentPage - 1) * rowsPerPage, currentPage * rowsPerPage);
  const rowBg = useMemo(() => (i: number) => i % 2 === 0 ? "#ffffff" : "#f0f7ff", []);

  // Excel columns that are already mapped to some DB column
  const mappedExcelCols = useMemo(() => new Set(Object.values(mappings)), [mappings]);
  const mappedDbCount = Object.keys(mappings).length;
  const headersKey = headers.join("|");
  const matchingTemplates = useMemo(
    () => templates.filter((t) => t.headersKey === headersKey),
    [templates, headersKey]
  );

  if (!authChecked) return null;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ── Login Modal ───────────────────────────────────────────────────── */}
      {!isAuthenticated && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center"
          style={{ background: "rgba(15,23,42,0.7)", backdropFilter: "blur(4px)" }}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl w-full max-w-sm mx-4 overflow-hidden"
            style={{ animation: "fadeInUp 0.25s ease" }}
          >
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
            <form onSubmit={handleLogin} className="px-8 pb-8 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">ชื่อผู้ใช้</label>
                <input type="text" value={loginUsername} onChange={(e) => setLoginUsername(e.target.value)}
                  placeholder="กรอก username" autoFocus required
                  className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">รหัสผ่าน</label>
                <div className="relative">
                  <input type={showPassword ? "text" : "password"} value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)} placeholder="กรอก password" required
                    className="w-full border border-gray-300 rounded-lg px-4 py-2.5 pr-11 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
                  <button type="button" onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600" tabIndex={-1}>
                    {showPassword ? (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                          d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                      </svg>
                    ) : (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                          d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>
              {loginError && (
                <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                  <svg className="w-4 h-4 text-red-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <p className="text-sm text-red-600">{loginError}</p>
                </div>
              )}
              <button type="submit" disabled={loginLoading}
                className="w-full py-2.5 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-60 disabled:cursor-not-allowed">
                {loginLoading ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    กำลังตรวจสอบ...
                  </span>
                ) : "เข้าสู่ระบบ"}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ── Header ────────────────────────────────────────────────────────── */}
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Import Excel / Menu Items</h1>
              <p className="text-sm text-gray-500 mt-0.5">อัปโหลดไฟล์ Excel เพื่อดูข้อมูลสินค้า</p>
            </div>
            {/* Step indicator */}
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
            <button onClick={handleLogout}
              className="flex items-center gap-2 px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              ออกจากระบบ
            </button>
          )}
        </div>
      </header>

      <main className="px-6 py-6">
        {/* ════════════════════════════════════════════════════════════════
            STEP 1 — IMPORT
        ════════════════════════════════════════════════════════════════ */}
        {step === "import" && (
          <>
            {/* Upload Zone */}
            {!data.length && (
              <div className="max-w-3xl mx-auto">
                <div
                  className={`border-2 border-dashed rounded-xl p-12 text-center cursor-pointer transition-colors ${
                    isDragging ? "border-blue-500 bg-blue-50" : "border-gray-300 bg-white hover:border-blue-400 hover:bg-blue-50"
                  }`}
                  onClick={() => fileInputRef.current?.click()}
                  onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                  onDragLeave={() => setIsDragging(false)}
                  onDrop={handleFileDrop}
                >
                  <div className="flex flex-col items-center gap-4">
                    <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center">
                      <svg className="w-8 h-8 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                          d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-lg font-semibold text-gray-700">ลากไฟล์มาวางที่นี่ หรือคลิกเพื่อเลือกไฟล์</p>
                      <p className="text-sm text-gray-400 mt-1">รองรับ .xlsx, .xls, .csv</p>
                    </div>
                  </div>
                  <input ref={fileInputRef} type="file" accept=".xlsx,.xls,.csv" onChange={handleFileChange} className="hidden" />
                </div>
              </div>
            )}

            {error && (
              <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm max-w-3xl mx-auto">{error}</div>
            )}

            {data.length > 0 && (
              <>
                {/* Controls bar */}
                <div className="bg-white rounded-xl border border-gray-200 p-4 mb-4">
                  <div className="flex items-center justify-between gap-4">
                    {/* Left: file info + sheet selector */}
                    <div className="flex items-center gap-3 min-w-0">
                      <svg className="w-5 h-5 text-green-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                          d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span className="font-medium text-gray-800 text-sm truncate">{fileName}</span>
                      <span className="px-2 py-0.5 bg-gray-100 rounded-full text-xs whitespace-nowrap">{data.length.toLocaleString()} แถว</span>
                      <span className="px-2 py-0.5 bg-gray-100 rounded-full text-xs whitespace-nowrap">{headers.length} คอลัมน์</span>
                      {sheets.length > 1 && (
                        <div className="flex items-center gap-1.5 flex-shrink-0">
                          <label className="text-xs text-gray-500">Sheet:</label>
                          <select value={selectedSheet} onChange={(e) => handleSheetChange(e.target.value)}
                            className="text-sm border border-gray-300 rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500">
                            {sheets.map((s) => <option key={s} value={s}>{s}</option>)}
                          </select>
                        </div>
                      )}
                    </div>

                    {/* Right: action buttons — always visible */}
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <button onClick={handleExportJson}
                        className="px-3 py-2 text-sm bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors whitespace-nowrap">
                        Export JSON
                      </button>
                      <button onClick={() => fileInputRef.current?.click()}
                        className="px-3 py-2 text-sm bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors whitespace-nowrap">
                        เปลี่ยนไฟล์
                      </button>
                      <button onClick={handleClear}
                        className="px-3 py-2 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors whitespace-nowrap">
                        ล้างข้อมูล
                      </button>
                      {/* ── Next Button ── */}
                      <button
                        onClick={() => setStep("mapping")}
                        className="flex items-center gap-1.5 px-4 py-2 text-sm bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors whitespace-nowrap"
                      >
                        ถัดไป: Mapping
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </button>
                    </div>
                  </div>
                  <input ref={fileInputRef} type="file" accept=".xlsx,.xls,.csv" onChange={handleFileChange} className="hidden" />
                </div>

                {/* Data Table */}
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
                              <th key={h}
                                className="relative px-3 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider select-none"
                                style={{ width: colWidths[h] ?? DEFAULT_COL_WIDTH }}>
                                <span className="block overflow-hidden text-ellipsis whitespace-nowrap pr-3">{h}</span>
                                <div className="absolute top-0 right-0 h-full w-4 z-10 flex items-stretch justify-end"
                                  style={{ cursor: "col-resize" }}
                                  onMouseEnter={() => setHoveredResizeCol(h)}
                                  onMouseLeave={() => setHoveredResizeCol(null)}
                                  onMouseDown={(e) => startResize(e, h)}>
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
                          <tr key={i} style={{ background: rowBg(i) }}
                            onMouseEnter={(e) => { (e.currentTarget as HTMLTableRowElement).style.background = "#dbeafe"; }}
                            onMouseLeave={(e) => { (e.currentTarget as HTMLTableRowElement).style.background = rowBg(i); }}>
                            <td className="px-3 py-2.5 text-xs select-none"
                              style={{ color: "#94a3b8", borderBottom: "1px solid #e2e8f0" }}>
                              {(currentPage - 1) * rowsPerPage + i + 1}
                            </td>
                            {headers.map((h) => (
                              <td key={h} title={String(row[h] ?? "")}
                                style={{
                                  padding: "10px 12px", color: "#374151",
                                  borderBottom: "1px solid #e2e8f0",
                                  width: colWidths[h] ?? DEFAULT_COL_WIDTH,
                                  maxWidth: colWidths[h] ?? DEFAULT_COL_WIDTH,
                                  overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                                }}>
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

                  {/* Pagination */}
                  {totalPages > 1 && (
                    <div className="border-t border-gray-200 px-4 py-3 flex items-center justify-between">
                      <span className="text-sm text-gray-500">
                        แสดง {(currentPage - 1) * rowsPerPage + 1}–{Math.min(currentPage * rowsPerPage, data.length)} จาก {data.length.toLocaleString()} แถว
                      </span>
                      <div className="flex items-center gap-1">
                        {[
                          { label: "«", action: () => setCurrentPage(1), disabled: currentPage === 1 },
                          { label: "‹", action: () => setCurrentPage((p) => Math.max(1, p - 1)), disabled: currentPage === 1 },
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
                            <button key={page} onClick={() => setCurrentPage(page)}
                              className={`px-3 py-1 text-sm rounded ${currentPage === page ? "bg-blue-500 text-white" : "hover:bg-gray-100 text-gray-700"}`}>
                              {page}
                            </button>
                          );
                        })}
                        {[
                          { label: "›", action: () => setCurrentPage((p) => Math.min(totalPages, p + 1)), disabled: currentPage === totalPages },
                          { label: "»", action: () => setCurrentPage(totalPages), disabled: currentPage === totalPages },
                        ].map((btn) => (
                          <button key={btn.label} onClick={btn.action} disabled={btn.disabled}
                            className="px-2 py-1 text-sm rounded hover:bg-gray-100 disabled:opacity-30">{btn.label}</button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </>
            )}
          </>
        )}

        {/* ════════════════════════════════════════════════════════════════
            STEP 2 — COLUMN MAPPING
        ════════════════════════════════════════════════════════════════ */}
        {step === "mapping" && (
          <div style={{ animation: "fadeInUp 0.2s ease" }}>

            {/* ── Save Template Modal ──────────────────────────────────── */}
            {showSaveModal && (
              <div className="fixed inset-0 z-50 flex items-center justify-center"
                style={{ background: "rgba(15,23,42,0.55)", backdropFilter: "blur(3px)" }}
                onClick={() => setShowSaveModal(false)}
              >
                <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm mx-4 p-6"
                  style={{ animation: "fadeInUp 0.2s ease" }}
                  onClick={(e) => e.stopPropagation()}
                >
                  <h3 className="text-base font-semibold text-gray-900 mb-1">บันทึก Template</h3>
                  <p className="text-xs text-gray-400 mb-4">
                    จะบันทึก: ตาราง, {dbColumns.length} columns, {mappedDbCount} mappings
                  </p>
                  <input
                    type="text"
                    value={templateName}
                    onChange={(e) => setTemplateName(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && saveTemplate()}
                    placeholder="ชื่อ template เช่น สินค้า v1"
                    autoFocus
                    className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 mb-4"
                  />
                  <div className="flex gap-2 justify-end">
                    <button onClick={() => setShowSaveModal(false)}
                      className="px-4 py-2 text-sm bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200">
                      ยกเลิก
                    </button>
                    <button onClick={saveTemplate} disabled={!templateName.trim()}
                      className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-40">
                      บันทึก
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* ── Save to DB Modal ─────────────────────────────────────── */}
            {showSaveDbModal && (
              <div className="fixed inset-0 z-50 flex items-center justify-center"
                style={{ background: "rgba(15,23,42,0.55)", backdropFilter: "blur(3px)" }}
                onClick={() => { if (saveDbStatus !== "loading") setShowSaveDbModal(false); }}
              >
                <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 p-6"
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
                        {data.length.toLocaleString()} แถว · {mappedDbCount} columns mapped
                        {targetTable && <> · ตาราง <span className="font-mono">{targetTable}</span></>}
                      </p>
                    </div>
                  </div>

                  {/* API URL input */}
                  {saveDbStatus === "idle" && (
                    <>
                      <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-700 mb-1">API Endpoint URL</label>
                        <input
                          type="text"
                          value={apiUrl}
                          onChange={(e) => setApiUrl(e.target.value)}
                          placeholder="http://localhost:3001/api/import"
                          className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-green-500"
                          autoFocus
                        />
                        <p className="text-xs text-gray-400 mt-1">จะส่ง POST request พร้อม JSON: <span className="font-mono">{"{ table, data: [...] }"}</span></p>
                      </div>

                      {/* Preview summary */}
                      <div className="bg-gray-50 rounded-lg p-3 mb-4 text-xs text-gray-600 space-y-1 border border-gray-100">
                        <div className="flex justify-between">
                          <span>จำนวนแถว</span>
                          <span className="font-semibold text-gray-800">{data.length.toLocaleString()}</span>
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

                      <div className="flex gap-2 justify-end">
                        <button onClick={() => setShowSaveDbModal(false)}
                          className="px-4 py-2 text-sm bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200">
                          ยกเลิก
                        </button>
                        <button
                          onClick={handleSaveToDb}
                          disabled={!apiUrl.trim()}
                          className="flex items-center gap-1.5 px-5 py-2 text-sm bg-green-600 text-white font-medium rounded-lg hover:bg-green-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                          บันทึก
                        </button>
                      </div>
                    </>
                  )}

                  {/* Loading state */}
                  {saveDbStatus === "loading" && (
                    <div className="py-8 flex flex-col items-center gap-3">
                      <svg className="w-8 h-8 text-green-500 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      <p className="text-sm text-gray-600">กำลังบันทึกข้อมูล {data.length.toLocaleString()} แถว...</p>
                    </div>
                  )}

                  {/* Success state */}
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
                      <button onClick={() => setShowSaveDbModal(false)}
                        className="mt-2 px-6 py-2 text-sm bg-green-600 text-white font-medium rounded-lg hover:bg-green-700">
                        ปิด
                      </button>
                    </div>
                  )}

                  {/* Error state */}
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
                        <button onClick={() => setShowSaveDbModal(false)}
                          className="px-4 py-2 text-sm bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200">
                          ปิด
                        </button>
                        <button onClick={() => { setSaveDbStatus("idle"); setSaveDbResult({ total: 0, success: 0, error: null }); }}
                          className="px-4 py-2 text-sm bg-red-500 text-white rounded-lg hover:bg-red-600">
                          ลองใหม่
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ── Top action bar ───────────────────────────────────────── */}
            <div className="bg-white rounded-xl border border-gray-200 p-4 mb-3 flex items-center gap-3">
              <button
                onClick={() => setStep("import")}
                className="flex items-center gap-1.5 px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                กลับ
              </button>

              <div className="h-5 w-px bg-gray-200" />

              <span className="text-sm text-gray-500">
                ไฟล์: <span className="font-medium text-gray-700">{fileName}</span>
              </span>
              <span className="px-2 py-0.5 bg-gray-100 rounded-full text-xs text-gray-600">
                {headers.length} Excel columns
              </span>
              {mappedDbCount > 0 && (
                <span className="px-2 py-0.5 bg-green-100 rounded-full text-xs text-green-700">
                  {mappedDbCount} mapped
                </span>
              )}

              <div className="ml-auto flex gap-2">
                {/* Templates button */}
                <button
                  onClick={() => setShowTemplatePanel((v) => !v)}
                  className="relative flex items-center gap-1.5 px-4 py-2 text-sm border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M4 6h16M4 10h16M4 14h8" />
                  </svg>
                  Templates
                  {/* badge: matching count */}
                  {matchingTemplates.length > 0 && (
                    <span className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-blue-600 text-white text-[10px] flex items-center justify-center font-bold">
                      {matchingTemplates.length}
                    </span>
                  )}
                </button>

                <button
                  onClick={() => setMappings({})}
                  className="px-4 py-2 text-sm bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Reset
                </button>
                <button
                  onClick={() => { setTemplateName(""); setShowSaveModal(true); }}
                  className="flex items-center gap-1.5 px-4 py-2 text-sm bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-lg hover:bg-indigo-100 transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
                  </svg>
                  บันทึก Template
                </button>
                <button
                  onClick={() => { setSaveDbStatus("idle"); setSaveDbResult({ total: 0, success: 0, error: null }); setShowSaveDbModal(true); }}
                  disabled={mappedDbCount === 0}
                  className="flex items-center gap-1.5 px-4 py-2 text-sm bg-green-600 text-white font-medium rounded-lg hover:bg-green-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582 4 8 4" />
                  </svg>
                  บันทึกลงฐานข้อมูล
                </button>
              </div>
            </div>

            {/* ── Template Panel ───────────────────────────────────────── */}
            {showTemplatePanel && (
              <div className="bg-white rounded-xl border border-gray-200 mb-3 overflow-hidden"
                style={{ animation: "fadeInUp 0.15s ease" }}>
                <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between bg-gray-50">
                  <div className="flex items-center gap-2">
                    <h4 className="text-sm font-semibold text-gray-700">Templates ที่บันทึกไว้</h4>
                    {matchingTemplates.length > 0 && (
                      <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded-full font-medium">
                        {matchingTemplates.length} ตรงกับไฟล์นี้
                      </span>
                    )}
                  </div>
                  <button onClick={() => setShowTemplatePanel(false)}
                    className="text-gray-400 hover:text-gray-600">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                {templates.length === 0 ? (
                  <div className="px-5 py-8 text-center text-sm text-gray-400">
                    ยังไม่มี template ที่บันทึกไว้
                  </div>
                ) : (
                  <div className="divide-y divide-gray-50">
                    {/* matching templates first */}
                    {[...matchingTemplates, ...templates.filter(t => t.headersKey !== headersKey)].map((tpl) => {
                      const isMatch = tpl.headersKey === headersKey;
                      return (
                        <div key={tpl.id}
                          className={`flex items-center gap-4 px-5 py-3 ${isMatch ? "bg-blue-50/40" : ""}`}>
                          {/* match indicator */}
                          <div className={`w-1.5 h-10 rounded-full flex-shrink-0 ${isMatch ? "bg-blue-400" : "bg-gray-200"}`} />

                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium text-gray-800 truncate">{tpl.name}</span>
                              {isMatch && (
                                <span className="text-[10px] font-semibold px-1.5 py-0.5 bg-blue-100 text-blue-600 rounded">ตรงกัน</span>
                              )}
                            </div>
                            <div className="text-xs text-gray-400 mt-0.5 flex gap-2">
                              {tpl.targetTable && <span>ตาราง: <span className="font-mono">{tpl.targetTable}</span></span>}
                              <span>{tpl.dbColumns.length} columns</span>
                              <span>{Object.keys(tpl.mappings).length} mapped</span>
                              <span>{new Date(tpl.createdAt).toLocaleDateString("th-TH")}</span>
                            </div>
                          </div>

                          <div className="flex gap-2 flex-shrink-0">
                            <button
                              onClick={() => loadTemplate(tpl)}
                              className="px-3 py-1.5 text-xs bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                            >
                              โหลด
                            </button>
                            <button
                              onClick={() => deleteTemplate(tpl.id)}
                              className="px-3 py-1.5 text-xs bg-gray-100 text-gray-500 rounded-lg hover:bg-red-50 hover:text-red-500 transition-colors"
                            >
                              ลบ
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* Two-column mapping layout */}
            <div className="flex gap-4" style={{ minHeight: "calc(100vh - 260px)" }}>

              {/* ── LEFT: Excel Columns ─────────────────────────────────── */}
              <div className="w-64 flex-shrink-0">
                <div className="bg-white rounded-xl border border-gray-200 overflow-hidden sticky top-4">
                  {/* Header */}
                  <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-semibold text-gray-800">Excel Columns</h3>
                      <p className="text-xs text-gray-400 mt-0.5">ลากไปวางฝั่งขวา</p>
                    </div>
                    <span className="text-xs font-medium text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">
                      {headers.length}
                    </span>
                  </div>

                  {/* Column list */}
                  <div className="overflow-y-auto" style={{ maxHeight: "70vh" }}>
                    {headers.map((col) => {
                      const isMapped = mappedExcelCols.has(col);
                      const isDraggingThis = draggedExcelCol === col;
                      return (
                        <div
                          key={col}
                          draggable
                          onDragStart={() => setDraggedExcelCol(col)}
                          onDragEnd={() => setDraggedExcelCol(null)}
                          style={{
                            cursor: "grab",
                            opacity: isDraggingThis ? 0.3 : 1,
                            userSelect: "none",
                            borderBottom: "1px solid #f1f5f9",
                          }}
                          className="px-4 py-2.5 hover:bg-blue-50 transition-colors"
                        >
                          <span
                            className="block truncate text-sm"
                            style={{ color: isMapped ? "#16a34a" : "#374151" }}
                          >
                            {col}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* ── RIGHT: DB Columns ───────────────────────────────────── */}
              <div className="flex-1">
                <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                  {/* Target table input */}
                  <div className="px-5 py-4 border-b border-gray-100 bg-gray-50 flex items-center gap-3">
                    <h3 className="text-sm font-semibold text-gray-700 flex-shrink-0">Database Columns</h3>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-400">ตาราง:</span>
                      <input
                        type="text"
                        value={targetTable}
                        onChange={(e) => setTargetTable(e.target.value)}
                        placeholder="table_name"
                        className="border border-gray-300 rounded-lg px-3 py-1 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500 w-44"
                      />
                    </div>
                  </div>

                  {/* Add column input */}
                  <div className="px-5 py-3 border-b border-gray-100 flex items-center gap-2">
                    <input
                      type="text"
                      value={newDbColInput}
                      onChange={(e) => setNewDbColInput(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && addDbColumn()}
                      placeholder="ชื่อ column ในฐานข้อมูล เช่น product_name"
                      className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <button
                      onClick={addDbColumn}
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
                        const isOver = dropOverCol === dbCol;
                        const isActiveDrag = !!draggedExcelCol;
                        return (
                          <div key={dbCol}
                            className="px-5 py-3 flex items-center gap-4 hover:bg-gray-50 transition-colors"
                          >
                            {/* DB column name */}
                            <div className="w-44 flex-shrink-0">
                              <span className="font-mono text-sm font-medium text-gray-700">{dbCol}</span>
                            </div>

                            {/* Arrow */}
                            <svg className="w-5 h-5 text-gray-300 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                            </svg>

                            {/* Drop zone */}
                            <div
                              className="flex-1"
                              onDragOver={(e) => { e.preventDefault(); setDropOverCol(dbCol); }}
                              onDragLeave={() => setDropOverCol(null)}
                              onDrop={(e) => {
                                e.preventDefault();
                                if (draggedExcelCol) {
                                  setMappings((prev) => ({ ...prev, [dbCol]: draggedExcelCol }));
                                  setDraggedExcelCol(null);
                                }
                                setDropOverCol(null);
                              }}
                            >
                              {mappedFrom ? (
                                // Mapped state
                                <div className="flex items-center gap-2 px-3 py-2 bg-green-50 border border-green-200 rounded-lg">
                                  <svg className="w-3.5 h-3.5 text-green-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                                  </svg>
                                  <span className="font-mono text-sm text-green-700 font-medium flex-1 truncate">{mappedFrom}</span>
                                  <button
                                    onClick={() => clearMapping(dbCol)}
                                    className="text-green-400 hover:text-red-500 transition-colors ml-1 flex-shrink-0"
                                    title="ลบ mapping"
                                  >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                  </button>
                                </div>
                              ) : (
                                // Empty drop zone
                                <div
                                  className="flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg border-2 border-dashed transition-all"
                                  style={{
                                    borderColor: isOver ? "#3b82f6" : isActiveDrag ? "#93c5fd" : "#e2e8f0",
                                    background: isOver ? "#eff6ff" : isActiveDrag ? "#f8faff" : "transparent",
                                  }}
                                >
                                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"
                                    style={{ color: isOver ? "#3b82f6" : "#cbd5e1" }}>
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                      d="M19 13l-7 7-7-7m14-8l-7 7-7-7" />
                                  </svg>
                                  <span className="text-xs" style={{ color: isOver ? "#3b82f6" : "#94a3b8" }}>
                                    {isOver ? "วางที่นี่" : "ลากคอลัมน์มาวาง"}
                                  </span>
                                </div>
                              )}
                            </div>

                            {/* Remove DB column */}
                            <button
                              onClick={() => removeDbColumn(dbCol)}
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
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
