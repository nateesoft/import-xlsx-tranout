"use client";

import { MappingTemplate } from "../types";

type Props = {
  templates: MappingTemplate[];
  matchingTemplates: MappingTemplate[];
  headersKey: string;
  onLoad: (tpl: MappingTemplate) => void;
  onDelete: (id: string) => void;
  onClose: () => void;
};

export default function TemplatePanel({
  templates,
  matchingTemplates,
  headersKey,
  onLoad,
  onDelete,
  onClose,
}: Props) {
  return (
    <div
      className="bg-white rounded-xl border border-gray-200 mb-3 overflow-hidden"
      style={{ animation: "fadeInUp 0.15s ease" }}
    >
      <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between bg-gray-50">
        <div className="flex items-center gap-2">
          <h4 className="text-sm font-semibold text-gray-700">Templates ที่บันทึกไว้</h4>
          {matchingTemplates.length > 0 && (
            <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded-full font-medium">
              {matchingTemplates.length} ตรงกับไฟล์นี้
            </span>
          )}
        </div>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
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
          {[...matchingTemplates, ...templates.filter((t) => t.headersKey !== headersKey)].map((tpl) => {
            const isMatch = tpl.headersKey === headersKey;
            return (
              <div
                key={tpl.id}
                className={`flex items-center gap-4 px-5 py-3 ${isMatch ? "bg-blue-50/40" : ""}`}
              >
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
                    onClick={() => onLoad(tpl)}
                    className="px-3 py-1.5 text-xs bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                  >
                    โหลด
                  </button>
                  <button
                    onClick={() => onDelete(tpl.id)}
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
  );
}
