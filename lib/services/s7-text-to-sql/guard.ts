const FORBIDDEN_KEYWORDS =
  /\b(insert|update|delete|drop|alter|truncate|grant|revoke|create|copy|call|execute|merge|vacuum|reindex|comment|lock|listen|notify|refresh|do)\b/i;

export function assertReadOnlySelect(rawSql: string): string {
  const sql = rawSql.trim().replace(/```sql|```/gi, "").trim().replace(/;+\s*$/, "");

  if (sql.includes(";")) {
    throw new Error("only a single statement is allowed - no semicolon-separated batches");
  }

  const first = sql.slice(0, 10).trim().toLowerCase();
  if (!(first.startsWith("select") || first.startsWith("with"))) {
    throw new Error("only read-only SELECT/WITH queries are allowed");
  }

  if (FORBIDDEN_KEYWORDS.test(sql)) {
    throw new Error("query contains a disallowed statement keyword");
  }

  const hasLimit = /\blimit\s+\d+/i.test(sql);
  return hasLimit ? sql : `${sql}\nLIMIT 200`;
}
