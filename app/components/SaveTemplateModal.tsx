"use client";

type Props = {
  templateName: string;
  dbColumnsCount: number;
  mappedDbCount: number;
  onChange: (name: string) => void;
  onSave: () => void;
  onClose: () => void;
};

export default function SaveTemplateModal({
  templateName,
  dbColumnsCount,
  mappedDbCount,
  onChange,
  onSave,
  onClose,
}: Props) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: "rgba(15,23,42,0.55)", backdropFilter: "blur(3px)" }}
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-sm mx-4 p-6"
        style={{ animation: "fadeInUp 0.2s ease" }}
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-base font-semibold text-gray-900 mb-1">บันทึก Template</h3>
        <p className="text-xs text-gray-400 mb-4">
          จะบันทึก: ตาราง, {dbColumnsCount} columns, {mappedDbCount} mappings
        </p>
        <input
          type="text"
          value={templateName}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && onSave()}
          placeholder="ชื่อ template เช่น สินค้า v1"
          autoFocus
          className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 mb-4"
        />
        <div className="flex gap-2 justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200"
          >
            ยกเลิก
          </button>
          <button
            onClick={onSave}
            disabled={!templateName.trim()}
            className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-40"
          >
            บันทึก
          </button>
        </div>
      </div>
    </div>
  );
}
