"use client";

const INDEX_COL = "__running_index__";
export { INDEX_COL };

type Props = {
  headers: string[];
  mappedExcelCols: Set<string>;
  draggedExcelCol: string | null;
  onDragStart: (col: string) => void;
  onDragEnd: () => void;
};

export default function ExcelColumnPanel({
  headers,
  mappedExcelCols,
  draggedExcelCol,
  onDragStart,
  onDragEnd,
}: Props) {
  return (
    <div className="w-64 flex-shrink-0">
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden sticky top-4">
        <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-gray-800">Excel Columns</h3>
            <p className="text-xs text-gray-400 mt-0.5">ลากไปวางฝั่งขวา</p>
          </div>
          <span className="text-xs font-medium text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">
            {headers.length}
          </span>
        </div>

        <div className="overflow-y-auto" style={{ maxHeight: "70vh" }}>
          {/* Virtual: running index */}
          <div
            draggable
            onDragStart={() => onDragStart(INDEX_COL)}
            onDragEnd={onDragEnd}
            style={{
              cursor: "grab",
              opacity: draggedExcelCol === INDEX_COL ? 0.3 : 1,
              userSelect: "none",
              borderBottom: "1px solid #ede9fe",
            }}
            className="px-4 py-2.5 bg-violet-50 hover:bg-violet-100 transition-colors flex items-center gap-2"
            title="Running index อัตโนมัติ (1, 2, 3, …)"
          >
            <span className="flex-shrink-0 w-5 h-5 rounded bg-violet-500 text-white text-[10px] font-bold flex items-center justify-center">#</span>
            <span
              className="text-sm font-medium truncate"
              style={{ color: mappedExcelCols.has(INDEX_COL) ? "#16a34a" : "#5b21b6" }}
            >
              running index
            </span>
          </div>

          {headers.map((col) => (
            <div
              key={col}
              draggable
              onDragStart={() => onDragStart(col)}
              onDragEnd={onDragEnd}
              style={{
                cursor: "grab",
                opacity: draggedExcelCol === col ? 0.3 : 1,
                userSelect: "none",
                borderBottom: "1px solid #f1f5f9",
              }}
              className="px-4 py-2.5 hover:bg-blue-50 transition-colors"
            >
              <span
                className="block truncate text-sm"
                style={{ color: mappedExcelCols.has(col) ? "#16a34a" : "#374151" }}
              >
                {col}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
