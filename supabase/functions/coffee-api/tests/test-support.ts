import { supabase } from "../utils/supabase.ts";

export interface DomainTableRow {
  [key: string]: unknown;
}
export type DomainTableMap = Record<string, DomainTableRow[]>;
export type MockRow = DomainTableRow;
export type MockTables = DomainTableMap;

function cloneRow<T>(value: T): T {
  return structuredClone(value);
}

function normalizeRows(value: unknown): DomainTableRow[] {
  if (!Array.isArray(value)) return [];
  return value.map((row) => cloneRow((row || {}) as DomainTableRow));
}

class MockQueryBuilder implements PromiseLike<DomainTableRow> {
  private filters: Array<(row: DomainTableRow) => boolean> = [];
  private orders: Array<{ column: string; ascending: boolean }> = [];
  private rangeStart: number | null = null;
  private rangeEnd: number | null = null;
  private mode: "select" | "insert" | "update" | "delete" | "upsert" = "select";
  private payload: unknown = undefined;
  private wantsCount = false;

  constructor(
    private readonly tables: DomainTableMap,
    private readonly tableName: string,
  ) {}

  select(_columns = "*", options?: { count?: string }) {
    if (options?.count === "exact") this.wantsCount = true;
    return this;
  }

  eq(column: string, value: unknown) {
    this.filters.push((row) => String(row[column] ?? "") === String(value));
    return this;
  }

  in(column: string, values: unknown[]) {
    const allowed = new Set(values.map((value) => String(value)));
    this.filters.push((row) => allowed.has(String(row[column] ?? "")));
    return this;
  }

  order(column: string, options?: { ascending?: boolean }) {
    this.orders.push({ column, ascending: options?.ascending !== false });
    return this;
  }

  range(start: number, end: number) {
    this.rangeStart = start;
    this.rangeEnd = end;
    return this;
  }

  insert(payload: unknown) {
    this.mode = "insert";
    this.payload = payload;
    return this;
  }

  update(payload: unknown) {
    this.mode = "update";
    this.payload = payload;
    return this;
  }

  delete() {
    this.mode = "delete";
    return this;
  }

  upsert(payload: unknown) {
    this.mode = "upsert";
    this.payload = payload;
    return this;
  }

  maybeSingle() {
    const rows = this.readRows();
    return {
      data: rows.length > 0 ? cloneRow(rows[0]) : null,
      error: null,
    };
  }

  single() {
    const rows = this.readRows();
    if (rows.length === 0) {
      return {
        data: null,
        error: { message: "找不到資料" },
      };
    }
    return {
      data: cloneRow(rows[0]),
      error: null,
    };
  }

  then<TResult1 = DomainTableRow, TResult2 = never>(
    onfulfilled?:
      | ((value: DomainTableRow) => TResult1 | PromiseLike<TResult1>)
      | null,
    onrejected?:
      | ((reason: unknown) => TResult2 | PromiseLike<TResult2>)
      | null,
  ): PromiseLike<TResult1 | TResult2> {
    return Promise.resolve(this.execute()).then(onfulfilled, onrejected);
  }

  private getTable(): DomainTableRow[] {
    if (!this.tables[this.tableName]) {
      this.tables[this.tableName] = [];
    }
    return this.tables[this.tableName];
  }

  private readRows(): DomainTableRow[] {
    let rows = [...this.getTable()];
    for (const filter of this.filters) {
      rows = rows.filter(filter);
    }
    for (const order of [...this.orders].reverse()) {
      rows.sort((a, b) => {
        const left = a[order.column];
        const right = b[order.column];
        if (left === right) return 0;
        const direction = order.ascending ? 1 : -1;
        return left! > right! ? direction : -direction;
      });
    }
    if (this.rangeStart !== null && this.rangeEnd !== null) {
      rows = rows.slice(this.rangeStart, this.rangeEnd + 1);
    }
    return rows;
  }

  private executeSelect() {
    const rows = this.readRows();
    return {
      data: cloneRow(rows),
      count: this.wantsCount ? rows.length : null,
      error: null,
    };
  }

  private executeInsert() {
    const table = this.getTable();
    const rows = normalizeRows(
      Array.isArray(this.payload) ? this.payload : [this.payload],
    );
    table.push(...rows);
    return { data: null, error: null };
  }

  private executeUpdate() {
    const table = this.getTable();
    const updates = cloneRow((this.payload || {}) as DomainTableRow);
    for (const row of table) {
      if (this.filters.every((filter) => filter(row))) {
        Object.assign(row, updates);
      }
    }
    return { data: null, error: null };
  }

  private executeDelete() {
    const table = this.getTable();
    const kept = table.filter((row) =>
      !this.filters.every((filter) => filter(row))
    );
    this.tables[this.tableName] = kept;
    return { data: null, error: null };
  }

  private executeUpsert() {
    const table = this.getTable();
    const rows = normalizeRows(
      Array.isArray(this.payload) ? this.payload : [this.payload],
    );
    for (const row of rows) {
      const key = "key" in row ? "key" : "id" in row ? "id" : null;
      if (!key) {
        table.push(row);
        continue;
      }
      const existing = table.find((item) =>
        String(item[key] ?? "") === String(row[key] ?? "")
      );
      if (existing) {
        Object.assign(existing, row);
      } else {
        table.push(row);
      }
    }
    return { data: null, error: null };
  }

  private execute() {
    switch (this.mode) {
      case "insert":
        return this.executeInsert();
      case "update":
        return this.executeUpdate();
      case "delete":
        return this.executeDelete();
      case "upsert":
        return this.executeUpsert();
      default:
        return this.executeSelect();
    }
  }
}

export async function withMockedSupabaseTables<T>(
  initialTables: DomainTableMap,
  fn: (tables: DomainTableMap) => Promise<T>,
): Promise<T> {
  const tables: DomainTableMap = Object.fromEntries(
    Object.entries(initialTables).map((
      [table, rows],
    ) => [table, normalizeRows(rows)]),
  );
  const target = supabase as unknown as {
    from: (tableName: string) => unknown;
  };
  const originalFrom = target.from.bind(supabase);
  target.from = (tableName: string) => new MockQueryBuilder(tables, tableName);
  try {
    return await fn(tables);
  } finally {
    target.from = originalFrom;
  }
}
