import * as SQLite from 'expo-sqlite';

async function getDb() {
  try {
    const db = await SQLite.openDatabaseAsync('myfridge.db');
    if (!db) console.warn('crud.getDb: expo-sqlite openDatabase not found');
    return db;
  } catch (err) {
    console.warn('crud.getDb: failed to open database', err);
    return null;
  }
}

type SqlParams = any[] | Record<string, any> | undefined;

export async function executeSql<T = any>(sql: string, params?: SqlParams): Promise<T[]> {
  const db = await getDb();
  if (!db) throw new Error('SQLite DB not available');
  return db.getAllAsync<T>(sql, params as any);
}

export async function runSql(sql: string, params?: SqlParams) {
  const db = await getDb();
  if (!db) throw new Error('SQLite DB not available');
  return db.runAsync(sql, params as any);
}

export async function addItem(data: Record<string, any>) {
  const keys = Object.keys(data);
  if (keys.length === 0) throw new Error('addItem requires at least one column');
  const placeholders = keys.map(() => '?').join(', ');
  const params = keys.map((k) => data[k]);
  const sql = `INSERT INTO items (${keys.join(', ')}) VALUES (${placeholders})`;
  await runSql(sql, params);
}

export async function getAllItems(): Promise<any[]> {
  return executeSql('SELECT * FROM items ORDER BY created_at DESC');
}

export async function getAllSections(): Promise<any[]> {
  return executeSql('SELECT * FROM sections ORDER BY sort_order ASC, id ASC');
}

export async function addSection(data: Record<string, any>) {
  const nextSort =
    data.sort_order != null
      ? data.sort_order
      : (await executeSql<{ next: number }>(`SELECT COALESCE(MAX(sort_order), 0) + 1 AS next FROM sections`))[0]
          ?.next ?? 1;
  if (data.sort_order == null) data.sort_order = nextSort;
  const keys = Object.keys(data);
  if (keys.length === 0) throw new Error('addSection requires at least one column');
  const placeholders = keys.map(() => '?').join(', ');
  const params = keys.map((k) => data[k]);
  const sql = `INSERT INTO sections (${keys.join(', ')}) VALUES (${placeholders})`;
  return runSql(sql, params);
}

export async function updateSectionSortOrders(updates: Array<{ id: number; sort_order: number }>) {
  if (!updates.length) return;
  const db = await getDb();
  if (!db) throw new Error('SQLite DB not available');
  const runner = async () => {
    for (const u of updates) {
      await db.runAsync(`UPDATE sections SET sort_order = ? WHERE id = ?`, [u.sort_order, u.id]);
    }
  };
  const tx = (db as any).withTransactionAsync;
  if (typeof tx === 'function') {
    await tx.call(db, runner);
  } else {
    await runner();
  }
}

export async function getItemById(id: number): Promise<any | null> {
  const db = await getDb();
  if (!db) throw new Error('SQLite DB not available');
  const row = await db.getFirstAsync<any>('SELECT * FROM items WHERE id = ? LIMIT 1', [id]);
  return row ?? null;
}

export async function updateItem(id: number, patch: Record<string, any>) {
  const sets: string[] = [];
  const params: any[] = [];
  Object.keys(patch).forEach((k) => {
    sets.push(`${k} = ?`);
    params.push((patch as any)[k]);
  });
  if (sets.length === 0) return;
  sets.push(`updated_at = datetime('now')`);
  params.push(id);
  await runSql(`UPDATE items SET ${sets.join(', ')} WHERE id = ?`, params);
}

export async function deleteItem(id: number) {
  await runSql('DELETE FROM items WHERE id = ?', [id]);
}
