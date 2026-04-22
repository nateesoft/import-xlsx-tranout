"use client";

import { useState, useEffect, useRef } from "react";
import { MySqlConfig } from "../types";

type Status = "idle" | "loading-tables" | "loading-cols" | "error";

type Props = {
  mysqlConfig: MySqlConfig;
  mysqlConnected: boolean;
  initialHeaderTable?: string;
  initialDetailTable?: string;
  onConfirm: (headerTable: string, detailTable: string) => Promise<void>;
  onClose: () => void;
};

export default function SelectTablesModal({
  mysqlConfig,
  mysqlConnected,
  initialHeaderTable = "",
  initialDetailTable = "",
  onConfirm,
  onClose,
}: Props) {
  const [tables, setTables] = useState<string[]>([]);
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState("");

  const [headerTable, setHeaderTable] = useState(initialHeaderTable);
  const [detailTable, setDetailTable] = useState(initialDetailTable);

  const [headerSearch, setHeaderSearch] = useState(initialHeaderTable);
  const [detailSearch, setDetailSearch] = useState(initialDetailTable);

  const [showHeaderList, setShowHeaderList] = useState(false);
  const [showDetailList, setShowDetailList] = useState(false);

  const headerRef = useRef<HTMLDivElement>(null);
  const detailRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!mysqlConnected) return;
    setStatus("loading-tables");
    fetch("/api/mysql/list-tables", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ config: mysqlConfig }),
    })
      .then((r) => r.json())
      .then((res) => {
        if (res.ok) {
          setTables(res.tables);
          setStatus("idle");
        } else {
          setError(res.error ?? "โหลด tables ไม่สำเร็จ");
          setStatus("error");
        }
      })
      .catch(() => {
        setError("ไม่สามารถเชื่อมต่อได้");
        setStatus("error");
      });
  }, [mysqlConnected, mysqlConfig]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (headerRef.current && !headerRef.current.contains(e.target as Node)) setShowHeaderList(false);
      if (detailRef.current && !detailRef.current.contains(e.target as Node)) setShowDetailList(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const filteredHeader = tables.filter((t) => t.toLowerCase().includes(headerSearch.toLowerCase()));
  const filteredDetail = tables.filter((t) => t.toLowerCase().includes(detailSearch.toLowerCase()));

  const handleConfirm = async () => {
    if (!detailTable.trim()) return;
    setStatus("loading-cols");
    setError("");
    try {
      await onConfirm(headerTable.trim(), detailTable.trim());
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "เกิดข้อผิดพลาด");
      setStatus("error");
    }
  };

  const canConfirm = !!detailTable.trim() && status !== "loading-cols" && status !== "loading-tables";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: "rgba(15,23,42,0.55)", backdropFilter: "blur(3px)" }}
      onClick={() => { if (status !== "loading-cols") onClose(); }}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 p-6"
        style={{ animation: "fadeInUp 0.2s ease" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
            <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582 4 8 4" />
            </svg>
          </div>
          <div>
            <h3 className="text-base font-semibold text-gray-900">เลือกตารางสำหรับ Mapping</h3>
            <p className="text-xs text-gray-400">กำหนด Header Table และ Detail Table ก่อนเริ่ม mapping</p>
          </div>
        </div>

        {!mysqlConnected && (
          <div className="mb-4 flex items-center gap-2 px-3 py-2.5 bg-red-50 border border-red-200 rounded-lg">
            <span className="w-2 h-2 rounded-full bg-red-400 flex-shrink-0" />
            <span className="text-sm text-red-700">กรุณาเชื่อมต่อ MySQL ก่อน</span>
          </div>
        )}

        {status === "loading-tables" && (
          <div className="flex items-center gap-2 mb-4 text-sm text-gray-500 px-1">
            <svg className="w-4 h-4 animate-spin text-blue-500" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            กำลังโหลดรายชื่อตาราง...
          </div>
        )}

        {/* Header Table */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            Header Table
            <span className="ml-1.5 text-xs font-normal text-gray-400">(ไม่บังคับ)</span>
          </label>
          <div ref={headerRef} className="relative">
            <input
              type="text"
              value={headerSearch}
              onChange={(e) => {
                setHeaderSearch(e.target.value);
                setHeaderTable(e.target.value);
                setShowHeaderList(true);
              }}
              onFocus={() => setShowHeaderList(true)}
              placeholder="พิมพ์หรือเลือกชื่อตาราง..."
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={status === "loading-cols"}
            />
            {headerTable && (
              <button
                onClick={() => { setHeaderTable(""); setHeaderSearch(""); }}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
            {showHeaderList && filteredHeader.length > 0 && (
              <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                {filteredHeader.map((t) => (
                  <button
                    key={t}
                    onClick={() => { setHeaderTable(t); setHeaderSearch(t); setShowHeaderList(false); }}
                    className={`w-full text-left px-3 py-2 text-sm hover:bg-blue-50 transition-colors ${headerTable === t ? "bg-blue-50 text-blue-700 font-medium" : "text-gray-700"}`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Detail Table */}
        <div className="mb-5">
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            Detail Table
            <span className="ml-1.5 text-xs font-normal text-red-500">*จำเป็น</span>
          </label>
          <div ref={detailRef} className="relative">
            <input
              type="text"
              value={detailSearch}
              onChange={(e) => {
                setDetailSearch(e.target.value);
                setDetailTable(e.target.value);
                setShowDetailList(true);
              }}
              onFocus={() => setShowDetailList(true)}
              placeholder="พิมพ์หรือเลือกชื่อตาราง..."
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={status === "loading-cols"}
            />
            {detailTable && (
              <button
                onClick={() => { setDetailTable(""); setDetailSearch(""); }}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
            {showDetailList && filteredDetail.length > 0 && (
              <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                {filteredDetail.map((t) => (
                  <button
                    key={t}
                    onClick={() => { setDetailTable(t); setDetailSearch(t); setShowDetailList(false); }}
                    className={`w-full text-left px-3 py-2 text-sm hover:bg-blue-50 transition-colors ${detailTable === t ? "bg-blue-50 text-blue-700 font-medium" : "text-gray-700"}`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {status === "error" && (
          <div className="mb-4 px-3 py-2.5 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
            {error}
          </div>
        )}

        {status === "loading-cols" && (
          <div className="mb-4 flex items-center gap-2 px-3 py-2.5 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-700">
            <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            กำลังโหลดข้อมูลคอลัมน์{headerTable ? "ทั้ง 2 ตาราง" : ""}...
          </div>
        )}

        <div className="flex gap-2 justify-end">
          <button
            onClick={onClose}
            disabled={status === "loading-cols"}
            className="px-4 py-2 text-sm bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 disabled:opacity-40"
          >
            ยกเลิก
          </button>
          <button
            onClick={handleConfirm}
            disabled={!canConfirm || !mysqlConnected}
            className="flex items-center gap-1.5 px-5 py-2 text-sm bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {status === "loading-cols" ? (
              <>
                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                กำลังโหลด...
              </>
            ) : (
              <>
                ยืนยัน
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
