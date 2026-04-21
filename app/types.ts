export type RowData = Record<string, string | number | boolean | null>;

export type MySqlConfig = {
  host: string;
  port: number;
  user: string;
  password: string;
  database: string;
};

export type ColDef = { name: string; type: string };

export type MappingTemplate = {
  id: string;
  name: string;
  headersKey: string;
  headerTable?: string;
  targetTable: string;
  dbColumns: string[];
  mappings: Record<string, string>;
  fixedValues?: Record<string, string>;
  createdAt: number;
};

export type SaveDbStatus = "idle" | "loading" | "success" | "error";
export type LoadStatus = "idle" | "loading" | "error";
export type MysqlSaveStatus = "idle" | "testing" | "ok" | "error";
