import { Client } from "pg";
import { assertReadOnlySelect } from "./guard";

const CONNECT_TIMEOUT_MS = 8000;
const STATEMENT_TIMEOUT_MS = 8000;
const MAX_SCHEMA_COLUMNS = 500;

async function withReadOnlyClient<T>(
  connectionString: string,
  fn: (client: Client) => Promise<T>
): Promise<T> {
  const client = new Client({
    connectionString,
    connectionTimeoutMillis: CONNECT_TIMEOUT_MS,
    statement_timeout: STATEMENT_TIMEOUT_MS,
  });
  await client.connect();
  try {
    return await fn(client);
  } finally {
    await client.end();
  }
}

export async function introspectSchema(connectionString: string): Promise<string> {
  return withReadOnlyClient(connectionString, async (client) => {
    const result = await client.query(
      `select table_name, column_name, data_type
       from information_schema.columns
       where table_schema = 'public'
       order by table_name, ordinal_position
       limit $1`,
      [MAX_SCHEMA_COLUMNS]
    );

    const tables = new Map<string, string[]>();
    for (const row of result.rows) {
      const cols = tables.get(row.table_name) ?? [];
      cols.push(`${row.column_name} ${row.data_type}`);
      tables.set(row.table_name, cols);
    }

    if (tables.size === 0) {
      throw new Error("no tables found in the public schema for this connection");
    }

    return Array.from(tables.entries())
      .map(([table, cols]) => `${table}(${cols.join(", ")})`)
      .join("\n");
  });
}

export async function runReadOnlyQuery(
  connectionString: string,
  rawSql: string
): Promise<{ columns: string[]; rows: Record<string, unknown>[] }> {
  const sql = assertReadOnlySelect(rawSql);

  return withReadOnlyClient(connectionString, async (client) => {
    await client.query("BEGIN TRANSACTION READ ONLY");
    try {
      const result = await client.query(sql);
      await client.query("COMMIT");
      return {
        columns: result.fields.map((f) => f.name),
        rows: result.rows,
      };
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    }
  });
}
