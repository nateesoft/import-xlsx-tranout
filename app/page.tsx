"use client";

import { useState, useRef, useCallback, useEffect, useMemo } from "react";
import * as XLSX from "xlsx";

import {
  RowData,
  MySqlConfig,
  ColDef,
  MappingTemplate,
  SaveDbStatus,
  LoadStatus,
  MysqlSaveStatus,
} from "./types";

import LoginModal from "./components/LoginModal";
import MySqlConfigModal from "./components/MySqlConfigModal";
import AppHeader from "./components/AppHeader";
import FileUploadZone from "./components/FileUploadZone";
import DataTable, { DEFAULT_COL_WIDTH, MIN_COL_WIDTH } from "./components/DataTable";
import SaveTemplateModal from "./components/SaveTemplateModal";
import SaveToDbModal from "./components/SaveToDbModal";
import TemplatePanel from "./components/TemplatePanel";
import HeaderTableCard from "./components/HeaderTableCard";
import ExcelColumnPanel, { INDEX_COL } from "./components/ExcelColumnPanel";
import DbColumnPanel from "./components/DbColumnPanel";
import SelectTablesModal from "./components/SelectTablesModal";

const SESSION_KEY = "xlsx_importer_auth";
const USER_KEY = "xlsx_current_user";
const TEMPLATES_KEY = "xlsx_mapping_templates";
const COL_LABELS_KEY = "xlsx_header_col_labels";
const DETAIL_LABELS_KEY = "xlsx_detail_col_labels";
const REQUIRED_COLS_KEY = "xlsx_detail_required_cols";
const ROWS_PER_PAGE = 20;

function resolveFormulas(
  values: Record<string, string>,
  detailRows: RowData[],
  currentUser: string
): Record<string, string> {
  const result: Record<string, string> = {};
  for (const [col, val] of Object.entries(values)) {
    result[col] = val.replace(/\{sum\((\w+)\)\}|\{username\}/gi, (match, colName) => {
      if (match.toLowerCase() === "{username}") return currentUser;
      const sum = detailRows.reduce((acc, row) => {
        const v = Number(row[colName]);
        return acc + (isNaN(v) ? 0 : v);
      }, 0);
      return parseFloat(sum.toFixed(10)).toString();
    });
  }
  return result;
}

export default function Home() {
  // ── Auth ──────────────────────────────────────────────────────────────────
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);
  const [loginError, setLoginError] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);
  const [currentUser, setCurrentUser] = useState("");

  // ── Data ──────────────────────────────────────────────────────────────────
  const [data, setData] = useState<RowData[]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [fileName, setFileName] = useState<string>("");
  const [sheets, setSheets] = useState<string[]>([]);
  const [selectedSheet, setSelectedSheet] = useState<string>("");
  const [workbook, setWorkbook] = useState<XLSX.WorkBook | null>(null);
  const [fileError, setFileError] = useState<string>("");
  const [currentPage, setCurrentPage] = useState(1);
  const [colWidths, setColWidths] = useState<Record<string, number>>({});
  const [hoveredResizeCol, setHoveredResizeCol] = useState<string | null>(null);
  const [resizingCol, setResizingCol] = useState<string | null>(null);

  // ── Step & Mapping ────────────────────────────────────────────────────────
  const [step, setStep] = useState<"import" | "mapping">("import");
  const [headerTable, setHeaderTable] = useState("");
  const [docNo, setDocNo] = useState("");
  const [docDate, setDocDate] = useState("");
  const [branchCode, setBranchCode] = useState("");
  const [targetTable, setTargetTable] = useState("");
  const [dbColumns, setDbColumns] = useState<string[]>([]);
  const [newDbColInput, setNewDbColInput] = useState("");
  const [mappings, setMappings] = useState<Record<string, string>>({});
  const [draggedExcelCol, setDraggedExcelCol] = useState<string | null>(null);
  const [dropOverCol, setDropOverCol] = useState<string | null>(null);
  const [fixedValues, setFixedValues] = useState<Record<string, string>>({});
  const [mappingChanged, setMappingChanged] = useState(false);

  // ── Templates ─────────────────────────────────────────────────────────────
  const [templates, setTemplates] = useState<MappingTemplate[]>([]);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [templateName, setTemplateName] = useState("");
  const [showTemplatePanel, setShowTemplatePanel] = useState(false);

  // ── Select Tables Modal ───────────────────────────────────────────────────
  const [showSelectTablesModal, setShowSelectTablesModal] = useState(false);

  // ── Save to DB ────────────────────────────────────────────────────────────
  const [showSaveDbModal, setShowSaveDbModal] = useState(false);
  const [saveDbStatus, setSaveDbStatus] = useState<SaveDbStatus>("idle");
  const [saveDbResult, setSaveDbResult] = useState<{ total: number; success: number; error: string | null }>({ total: 0, success: 0, error: null });

  // ── MySQL ──────────────────────────────────────────────────────────────────
  const [mysqlConfig, setMysqlConfig] = useState<MySqlConfig>({ host: "localhost", port: 3306, user: "", password: "", database: "" });
  const [mysqlConnected, setMysqlConnected] = useState(false);
  const [showMysqlModal, setShowMysqlModal] = useState(false);
  const [mysqlSaveStatus, setMysqlSaveStatus] = useState<MysqlSaveStatus>("idle");
  const [mysqlSaveError, setMysqlSaveError] = useState("");
  const [loadColStatus, setLoadColStatus] = useState<LoadStatus>("idle");
  const [loadColError, setLoadColError] = useState("");
  const [headerColDefs, setHeaderColDefs] = useState<ColDef[]>([]);
  const [headerFieldValues, setHeaderFieldValues] = useState<Record<string, string>>({});
  const [headerColStatus, setHeaderColStatus] = useState<LoadStatus>("idle");
  const [headerColError, setHeaderColError] = useState("");
  // colName → display label (per table, persisted in localStorage)
  const [headerColLabels, setHeaderColLabels] = useState<Record<string, string>>({});
  const [dbColLabels, setDbColLabels] = useState<Record<string, string>>({});
  const [requiredCols, setRequiredCols] = useState<Set<string>>(new Set());

  const fileInputRef = useRef<HTMLInputElement>(null);
  const resizeRef = useRef<{ col: string; startX: number; startWidth: number } | null>(null);

  // ── Session + templates on mount ─────────────────────────────────────────
  useEffect(() => {
    const stored = localStorage.getItem(SESSION_KEY);
    if (stored === "1") {
      setIsAuthenticated(true);
      setCurrentUser(localStorage.getItem(USER_KEY) ?? "");
    }
    setAuthChecked(true);
    try {
      const tpls = localStorage.getItem(TEMPLATES_KEY);
      if (tpls) setTemplates(JSON.parse(tpls));
    } catch {}
    fetch("/api/mysql/load-config")
      .then((r) => r.json())
      .then((cfg) => { if (cfg) setMysqlConfig(cfg); })
      .catch(() => {});
  }, []);

  // ── Auth handlers ─────────────────────────────────────────────────────────
  const handleLogin = async (username: string, password: string) => {
    setLoginError("");
    setLoginLoading(true);
    try {
      if (mysqlConfig.host && mysqlConfig.user && mysqlConfig.database) {
        const res = await fetch("/api/mysql/authenticate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ config: mysqlConfig, username, password }),
        });
        const json = await res.json();
        if (json.ok) {
          localStorage.setItem(SESSION_KEY, "1");
          localStorage.setItem(USER_KEY, username);
          setCurrentUser(username);
          setIsAuthenticated(true);
        } else {
          setLoginError(json.error ?? "เข้าสู่ระบบไม่สำเร็จ");
        }
        return;
      }
      const res = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      if (res.ok) {
        localStorage.setItem(SESSION_KEY, "1");
        localStorage.setItem(USER_KEY, username);
        setCurrentUser(username);
        setIsAuthenticated(true);
      } else {
        const json = await res.json();
        setLoginError(json.error ?? "เกิดข้อผิดพลาด");
      }
    } catch {
      setLoginError("ไม่สามารถเชื่อมต่อได้");
    } finally {
      setLoginLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem(SESSION_KEY);
    localStorage.removeItem(USER_KEY);
    setIsAuthenticated(false);
    setCurrentUser("");
    setLoginError("");
  };

  // ── MySQL handlers ─────────────────────────────────────────────────────────
  const handleMysqlConnect = async () => {
    setMysqlSaveStatus("testing");
    setMysqlSaveError("");
    try {
      const testRes = await fetch("/api/mysql/test-connection", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(mysqlConfig),
      });
      const res = await testRes.json();
      if (res.ok) {
        await fetch("/api/mysql/save-config", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(mysqlConfig),
        });
        setMysqlConnected(true);
        setMysqlSaveStatus("ok");
        setTimeout(() => { setShowMysqlModal(false); setMysqlSaveStatus("idle"); }, 800);
      } else {
        setMysqlSaveStatus("error");
        setMysqlSaveError(res.error ?? "เชื่อมต่อไม่สำเร็จ");
      }
    } catch {
      setMysqlSaveStatus("error");
      setMysqlSaveError("ไม่สามารถเชื่อมต่อได้");
    }
  };

  const handleLoadColumnsFromDb = async () => {
    const trimmed = targetTable.trim();
    if (!trimmed) return;
    setLoadColStatus("loading");
    setLoadColError("");
    try {
      const r = await fetch("/api/mysql/get-columns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ config: mysqlConfig, table: trimmed }),
      });
      const res = await r.json();
      if (res.ok && res.columns) {
        setDbColumns(res.columns);
        setMappings({});
        setFixedValues({});
        try {
          const all = JSON.parse(localStorage.getItem(DETAIL_LABELS_KEY) ?? "{}");
          setDbColLabels(all[trimmed] ?? {});
        } catch { setDbColLabels({}); }
        try {
          const allReq = JSON.parse(localStorage.getItem(REQUIRED_COLS_KEY) ?? "{}");
          setRequiredCols(new Set<string>(allReq[trimmed] ?? []));
        } catch { setRequiredCols(new Set()); }
        setLoadColStatus("idle");
      } else {
        setLoadColStatus("error");
        setLoadColError(res.error ?? "โหลดไม่สำเร็จ");
      }
    } catch {
      setLoadColStatus("error");
      setLoadColError("ไม่สามารถเชื่อมต่อได้");
    }
  };

  const handleLoadHeaderColumnsFromDb = async () => {
    const trimmed = headerTable.trim();
    if (!trimmed) return;
    setHeaderColStatus("loading");
    setHeaderColError("");
    try {
      const r = await fetch("/api/mysql/get-column-defs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ config: mysqlConfig, table: trimmed }),
      });
      const res = await r.json();
      if (res.ok && res.columns) {
        setHeaderColDefs(res.columns);
        const init: Record<string, string> = {};
        res.columns.forEach((c: ColDef) => { init[c.name] = ""; });
        setHeaderFieldValues(init);
        // load saved labels for this table
        try {
          const all = JSON.parse(localStorage.getItem(COL_LABELS_KEY) ?? "{}");
          setHeaderColLabels(all[trimmed] ?? {});
        } catch { setHeaderColLabels({}); }
        setHeaderColStatus("idle");
      } else {
        setHeaderColStatus("error");
        setHeaderColError(res.error ?? "โหลดไม่สำเร็จ");
      }
    } catch {
      setHeaderColStatus("error");
      setHeaderColError("ไม่สามารถเชื่อมต่อได้");
    }
  };

  // ── Column resize ─────────────────────────────────────────────────────────
  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      if (!resizeRef.current) return;
      const { col, startX, startWidth } = resizeRef.current;
      const delta = e.clientX - startX;
      setColWidths((prev) => ({ ...prev, [col]: Math.max(MIN_COL_WIDTH, startWidth + delta) }));
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
    setFileError("");
    if (!file.name.endsWith(".xlsx") && !file.name.endsWith(".xls") && !file.name.endsWith(".csv")) {
      setFileError("รองรับเฉพาะไฟล์ .xlsx, .xls, .csv เท่านั้น");
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
        setFileError("ไม่สามารถอ่านไฟล์ได้ กรุณาตรวจสอบรูปแบบไฟล์");
      }
    };
    reader.readAsArrayBuffer(file);
    setMappingChanged(false);
  }, [parseSheet]);

  const handleSheetChange = (sheetName: string) => {
    setSelectedSheet(sheetName);
    if (workbook) parseSheet(workbook, sheetName);
  };

  const handleClear = () => {
    setData([]); setHeaders([]); setFileName(""); setSheets([]);
    setSelectedSheet(""); setWorkbook(null); setFileError("");
    setCurrentPage(1); setColWidths({}); setStep("import");
    setHeaderTable(""); setDocNo(""); setDocDate(""); setBranchCode("");
    setFixedValues({});
    setHeaderColDefs([]); setHeaderFieldValues({}); setHeaderColStatus("idle"); setHeaderColError("");
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
    setMappingChanged(true);
  };

  const removeDbColumn = (col: string) => {
    setDbColumns((prev) => prev.filter((c) => c !== col));
    setMappings((prev) => { const next = { ...prev }; delete next[col]; return next; });
    setFixedValues((prev) => { const next = { ...prev }; delete next[col]; return next; });
    setMappingChanged(true);
  };

  const clearMapping = (dbCol: string) => {
    setMappings((prev) => { const next = { ...prev }; delete next[dbCol]; return next; });
    setMappingChanged(true);
  };

  const setFixedValue = (dbCol: string, value: string) => {
    setFixedValues((prev) => ({ ...prev, [dbCol]: value }));
    if (value !== "") {
      setMappings((prev) => { const next = { ...prev }; delete next[dbCol]; return next; });
    }
    setMappingChanged(true);
  };

  const clearFixedValue = (dbCol: string) => {
    setFixedValues((prev) => { const next = { ...prev }; delete next[dbCol]; return next; });
    setMappingChanged(true);
  };

  const handleDrop = (dbCol: string) => {
    if (draggedExcelCol) {
      setMappings((prev) => ({ ...prev, [dbCol]: draggedExcelCol }));
      clearFixedValue(dbCol);
      setDraggedExcelCol(null);
      setMappingChanged(true);
    }
  };

  const handleSaveToDb = async () => {
    setSaveDbStatus("loading");
    setSaveDbResult({ total: detailPreviewRows.length, success: 0, error: null });

    if (!mysqlConnected || !mysqlConfig) {
      setSaveDbStatus("error");
      setSaveDbResult({ total: detailPreviewRows.length, success: 0, error: "กรุณาเชื่อมต่อ MySQL ก่อนบันทึก" });
      return;
    }

    try {
      const r = await fetch("/api/mysql/insert-data", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          config: mysqlConfig,
          headerTable: headerTable || undefined,
          headerData: headerColDefs.length > 0 ? resolveFormulas(headerFieldValues, detailPreviewRows, currentUser) : { doc_no: docNo, date: docDate, branch_code: branchCode },
          detailTable: targetTable || undefined,
          detailData: detailPreviewRows,
        }),
      });
      const result = await r.json();
      if (result.ok) {
        setSaveDbStatus("success");
        setSaveDbResult({ total: detailPreviewRows.length, success: result.inserted ?? detailPreviewRows.length, error: null });
      } else {
        setSaveDbStatus("error");
        setSaveDbResult({ total: detailPreviewRows.length, success: 0, error: result.error ?? "เกิดข้อผิดพลาด" });
      }
    } catch (err: unknown) {
      setSaveDbStatus("error");
      setSaveDbResult({ total: detailPreviewRows.length, success: 0, error: err instanceof Error ? err.message : "ไม่สามารถเชื่อมต่อได้" });
    }
  };

  // ── Required columns handler ──────────────────────────────────────────────
  const handleToggleRequired = (colName: string) => {
    setRequiredCols((prev) => {
      const next = new Set(prev);
      if (next.has(colName)) next.delete(colName); else next.add(colName);
      try {
        const all = JSON.parse(localStorage.getItem(REQUIRED_COLS_KEY) ?? "{}");
        all[targetTable] = [...next];
        localStorage.setItem(REQUIRED_COLS_KEY, JSON.stringify(all));
      } catch {}
      return next;
    });
  };

  // ── Detail column label handler ───────────────────────────────────────────
  const handleDbColLabelChange = (colName: string, label: string) => {
    const updated = { ...dbColLabels, [colName]: label };
    if (!label) delete updated[colName];
    setDbColLabels(updated);
    try {
      const all = JSON.parse(localStorage.getItem(DETAIL_LABELS_KEY) ?? "{}");
      all[targetTable] = updated;
      localStorage.setItem(DETAIL_LABELS_KEY, JSON.stringify(all));
    } catch {}
  };

  // ── Header column label handler ───────────────────────────────────────────
  const handleHeaderColLabelChange = (colName: string, label: string) => {
    const updated = { ...headerColLabels, [colName]: label };
    if (!label) delete updated[colName];
    setHeaderColLabels(updated);
    try {
      const all = JSON.parse(localStorage.getItem(COL_LABELS_KEY) ?? "{}");
      all[headerTable] = updated;
      localStorage.setItem(COL_LABELS_KEY, JSON.stringify(all));
    } catch {}
  };

  // ── Template handlers ─────────────────────────────────────────────────────
  const saveTemplate = () => {
    const name = templateName.trim();
    if (!name) return;
    const tpl: MappingTemplate = {
      id: Date.now().toString(),
      name,
      headersKey: headers.join("|"),
      headerTable,
      targetTable,
      dbColumns: [...dbColumns],
      mappings: { ...mappings },
      fixedValues: { ...fixedValues },
      createdAt: Date.now(),
    };
    const updated = [...templates, tpl];
    setTemplates(updated);
    localStorage.setItem(TEMPLATES_KEY, JSON.stringify(updated));
    setShowSaveModal(false);
    setTemplateName("");
  };

  const loadTemplate = (tpl: MappingTemplate) => {
    setHeaderTable(tpl.headerTable ?? "");
    setTargetTable(tpl.targetTable);
    setDbColumns([...tpl.dbColumns]);
    setMappings({ ...tpl.mappings });
    setFixedValues({ ...(tpl.fixedValues ?? {}) });
    setShowTemplatePanel(false);
    setMappingChanged(true);
  };

  const deleteTemplate = (id: string) => {
    const updated = templates.filter((t) => t.id !== id);
    setTemplates(updated);
    localStorage.setItem(TEMPLATES_KEY, JSON.stringify(updated));
  };

  // ── Derived ───────────────────────────────────────────────────────────────
  const detailPreviewRows = useMemo<RowData[]>(() => {
    const transformed = data.map((row, rowIndex) => {
      const result: RowData = {};
      for (const [dbCol, excelCol] of Object.entries(mappings)) {
        result[dbCol] = excelCol === INDEX_COL ? rowIndex + 1 : (row[excelCol] ?? null);
      }
      for (const [dbCol, value] of Object.entries(fixedValues)) {
        if (value !== "") result[dbCol] = value;
      }
      return result;
    });
    return transformed.filter((row) =>
      ![...requiredCols].some((col) => {
        const val = row[col];
        return val === null || val === undefined || val === "";
      })
    );
  }, [data, mappings, fixedValues, requiredCols]);

  const mappedExcelCols = useMemo(() => new Set(Object.values(mappings)), [mappings]);
  const mappedDbCount = Object.keys(mappings).length + Object.keys(fixedValues).filter((k) => fixedValues[k] !== "").length;
  const headersKey = headers.join("|");
  const matchingTemplates = useMemo(
    () => templates.filter((t) => t.headersKey === headersKey),
    [templates, headersKey]
  );

  const openMysqlModal = () => { setMysqlSaveStatus("idle"); setMysqlSaveError(""); setShowMysqlModal(true); };

  // ── Select Tables confirm: load both tables then go to mapping ────────────
  const handleSelectTablesConfirm = async (selHeaderTable: string, selDetailTable: string) => {
    const promises: Promise<void>[] = [];

    if (selHeaderTable) {
      setHeaderTable(selHeaderTable);
      setHeaderColStatus("loading");
      setHeaderColError("");
      promises.push(
        fetch("/api/mysql/get-column-defs", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ config: mysqlConfig, table: selHeaderTable }),
        })
          .then((r) => r.json())
          .then((res) => {
            if (res.ok && res.columns) {
              setHeaderColDefs(res.columns);
              const init: Record<string, string> = {};
              res.columns.forEach((c: { name: string }) => { init[c.name] = ""; });
              setHeaderFieldValues(init);
              try {
                const all = JSON.parse(localStorage.getItem(COL_LABELS_KEY) ?? "{}");
                setHeaderColLabels(all[selHeaderTable] ?? {});
              } catch { setHeaderColLabels({}); }
              setHeaderColStatus("idle");
            } else {
              setHeaderColStatus("error");
              setHeaderColError(res.error ?? "โหลด header columns ไม่สำเร็จ");
              throw new Error(res.error ?? "โหลด header columns ไม่สำเร็จ");
            }
          })
      );
    } else {
      setHeaderTable("");
      setHeaderColDefs([]);
      setHeaderFieldValues({});
      setHeaderColStatus("idle");
      setHeaderColError("");
    }

    setTargetTable(selDetailTable);
    setLoadColStatus("loading");
    setLoadColError("");
    promises.push(
      fetch("/api/mysql/get-columns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ config: mysqlConfig, table: selDetailTable }),
      })
        .then((r) => r.json())
        .then((res) => {
          if (res.ok && res.columns) {
            setDbColumns(res.columns);
            setMappings({});
            setFixedValues({});
            try {
              const all = JSON.parse(localStorage.getItem(DETAIL_LABELS_KEY) ?? "{}");
              setDbColLabels(all[selDetailTable] ?? {});
            } catch { setDbColLabels({}); }
            try {
              const allReq = JSON.parse(localStorage.getItem(REQUIRED_COLS_KEY) ?? "{}");
              setRequiredCols(new Set<string>(allReq[selDetailTable] ?? []));
            } catch { setRequiredCols(new Set()); }
            setLoadColStatus("idle");
          } else {
            setLoadColStatus("error");
            setLoadColError(res.error ?? "โหลด detail columns ไม่สำเร็จ");
            throw new Error(res.error ?? "โหลด detail columns ไม่สำเร็จ");
          }
        })
    );

    await Promise.all(promises);
    setShowSelectTablesModal(false);
    setShowSaveDbModal(false);
    setSaveDbStatus("idle");
    setSaveDbResult({ total: 0, success: 0, error: null });
    setStep("mapping");
  };

  if (!authChecked) return null;

  return (
    <div className="min-h-screen bg-gray-50">
      {!isAuthenticated && (
        <LoginModal
          mysqlConfig={mysqlConfig}
          loginError={loginError}
          loginLoading={loginLoading}
          onLogin={handleLogin}
          onOpenMysqlModal={openMysqlModal}
        />
      )}

      {showMysqlModal && (
        <MySqlConfigModal
          config={mysqlConfig}
          saveStatus={mysqlSaveStatus}
          saveError={mysqlSaveError}
          onChange={setMysqlConfig}
          onConnect={handleMysqlConnect}
          onClose={() => { if (mysqlSaveStatus !== "testing") setShowMysqlModal(false); }}
        />
      )}

      {showSelectTablesModal && (
        <SelectTablesModal
          mysqlConfig={mysqlConfig}
          mysqlConnected={mysqlConnected}
          initialHeaderTable={headerTable}
          initialDetailTable={targetTable}
          onConfirm={handleSelectTablesConfirm}
          onClose={() => setShowSelectTablesModal(false)}
        />
      )}

      <AppHeader
        data={data}
        step={step}
        mysqlConnected={mysqlConnected}
        mysqlConfig={mysqlConfig}
        isAuthenticated={isAuthenticated}
        onOpenMysqlModal={openMysqlModal}
        onLogout={handleLogout}
      />

      <main className="px-6 py-6">
        {/* ── STEP 1: IMPORT ── */}
        {step === "import" && (
          <>
            {!data.length && (
              <FileUploadZone error={fileError} onFile={processFile} />
            )}

            {fileError && data.length > 0 && (
              <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm max-w-3xl mx-auto">
                {fileError}
              </div>
            )}

            {data.length > 0 && (
              <>
                {/* Controls bar */}
                <div className="bg-white rounded-xl border border-gray-200 p-4 mb-4">
                  <div className="flex items-center justify-between gap-4">
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
                          <select
                            value={selectedSheet}
                            onChange={(e) => handleSheetChange(e.target.value)}
                            className="text-sm border border-gray-300 rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
                          >
                            {sheets.map((s) => <option key={s} value={s}>{s}</option>)}
                          </select>
                        </div>
                      )}
                    </div>

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
                      <button
                        onClick={() => setShowSelectTablesModal(true)}
                        className="flex items-center gap-1.5 px-4 py-2 text-sm bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors whitespace-nowrap"
                      >
                        ถัดไป: Mapping
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </button>
                    </div>
                  </div>
                  <input ref={fileInputRef} type="file" accept=".xlsx,.xls,.csv"
                    onChange={(e) => { const f = e.target.files?.[0]; if (f) processFile(f); }}
                    className="hidden" />
                </div>

                <DataTable
                  data={data}
                  headers={headers}
                  currentPage={currentPage}
                  rowsPerPage={ROWS_PER_PAGE}
                  colWidths={colWidths}
                  resizingCol={resizingCol}
                  hoveredResizeCol={hoveredResizeCol}
                  onPageChange={setCurrentPage}
                  onStartResize={startResize}
                  onHoverResizeCol={setHoveredResizeCol}
                />
              </>
            )}
          </>
        )}

        {/* ── STEP 2: MAPPING ── */}
        {step === "mapping" && (
          <div style={{ animation: "fadeInUp 0.2s ease" }}>
            {showSaveModal && (
              <SaveTemplateModal
                templateName={templateName}
                dbColumnsCount={dbColumns.length}
                mappedDbCount={mappedDbCount}
                onChange={setTemplateName}
                onSave={saveTemplate}
                onClose={() => setShowSaveModal(false)}
              />
            )}

            {showSaveDbModal && (
              <SaveToDbModal
                dataLength={data.length}
                mappedDbCount={mappedDbCount}
                targetTable={targetTable}
                headerTable={headerTable}
                docNo={docNo}
                docDate={docDate}
                branchCode={branchCode}
                mysqlConnected={mysqlConnected}
                mysqlConfig={mysqlConfig}
                saveDbStatus={saveDbStatus}
                saveDbResult={saveDbResult}
                onSave={handleSaveToDb}
                onClose={() => { if (saveDbStatus !== "loading") setShowSaveDbModal(false); }}
                onRetry={() => { setSaveDbStatus("idle"); setSaveDbResult({ total: 0, success: 0, error: null }); }}
                onSuccess={() => { setShowSaveDbModal(false); handleClear(); }}
              />
            )}

            {/* Top action bar */}
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
                <button
                  onClick={() => setShowTemplatePanel((v) => !v)}
                  className="relative flex items-center gap-1.5 px-4 py-2 text-sm border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h8" />
                  </svg>
                  Templates
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
                  disabled={!mappingChanged || mappedDbCount === 0 || !targetTable.trim()}
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

            {showTemplatePanel && (
              <TemplatePanel
                templates={templates}
                matchingTemplates={matchingTemplates}
                headersKey={headersKey}
                onLoad={loadTemplate}
                onDelete={deleteTemplate}
                onClose={() => setShowTemplatePanel(false)}
              />
            )}

            <HeaderTableCard
              headerTable={headerTable}
              headerColDefs={headerColDefs}
              headerColStatus={headerColStatus}
              headerColError={headerColError}
              headerFieldValues={headerFieldValues}
              headerColLabels={headerColLabels}
              detailPreviewRows={detailPreviewRows}
              currentUser={currentUser}
              docNo={docNo}
              docDate={docDate}
              branchCode={branchCode}
              onHeaderTableChange={(v) => { setHeaderTable(v); setHeaderColDefs([]); setHeaderFieldValues({}); setHeaderColStatus("idle"); setHeaderColError(""); }}
              onLoadHeaderColumns={handleLoadHeaderColumnsFromDb}
              onHeaderFieldChange={(col, val) => setHeaderFieldValues((prev) => ({ ...prev, [col]: val }))}
              onHeaderColLabelChange={handleHeaderColLabelChange}
              onDocNoChange={setDocNo}
              onDocDateChange={setDocDate}
              onBranchCodeChange={setBranchCode}
            />

            <div className="flex gap-4" style={{ minHeight: "calc(100vh - 260px)" }}>
              <ExcelColumnPanel
                headers={headers}
                mappedExcelCols={mappedExcelCols}
                draggedExcelCol={draggedExcelCol}
                onDragStart={setDraggedExcelCol}
                onDragEnd={() => setDraggedExcelCol(null)}
              />
              <DbColumnPanel
                dbColumns={dbColumns}
                mappings={mappings}
                fixedValues={fixedValues}
                dbColLabels={dbColLabels}
                draggedExcelCol={draggedExcelCol}
                dropOverCol={dropOverCol}
                targetTable={targetTable}
                loadColStatus={loadColStatus}
                loadColError={loadColError}
                newDbColInput={newDbColInput}
                onTargetTableChange={(v) => { setTargetTable(v); setLoadColStatus("idle"); setLoadColError(""); setRequiredCols(new Set()); }}
                onLoadColumns={handleLoadColumnsFromDb}
                onNewDbColInputChange={setNewDbColInput}
                onAddDbColumn={addDbColumn}
                onRemoveDbColumn={removeDbColumn}
                onClearMapping={clearMapping}
                onSetFixedValue={setFixedValue}
                onClearFixedValue={clearFixedValue}
                onDropOverCol={setDropOverCol}
                onDrop={handleDrop}
                onDbColLabelChange={handleDbColLabelChange}
                requiredCols={requiredCols}
                onToggleRequired={handleToggleRequired}
              />
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
