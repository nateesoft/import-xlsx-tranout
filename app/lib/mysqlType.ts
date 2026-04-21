export function mysqlTypeToInputType(
  mysqlType: string
): "text" | "number" | "date" | "datetime-local" | "time" {
  const t = mysqlType.toLowerCase();
  if (/^(int|tinyint|smallint|mediumint|bigint|float|double|decimal|numeric)/.test(t)) return "number";
  if (t === "date") return "date";
  if (/^(datetime|timestamp)/.test(t)) return "datetime-local";
  if (t === "time") return "time";
  return "text";
}
