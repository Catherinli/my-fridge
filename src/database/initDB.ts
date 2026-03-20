// src/database/initDB.ts
import * as SQLite from 'expo-sqlite';
import { CREATE_TABLES_SQL, DB_VERSION } from './schema';

export const initDB = async () => {
  const db = await SQLite.openDatabaseAsync('myfridge.db');

  // 创建版本控制表
  await db.execAsync(`CREATE TABLE IF NOT EXISTS db_meta (key TEXT PRIMARY KEY, value TEXT);`);

  // 检查版本
  const meta = (await db.getFirstAsync(`SELECT value FROM db_meta WHERE key='db_version';`)) as { value?: string } | null;
  const currentVersion = meta?.value ?? null;

  const ensureSectionsSortOrder = async () => {
    const cols = (await db.getAllAsync(`PRAGMA table_info(sections);`)) as Array<{ name?: string }> | null;
    const hasSortOrder = (cols ?? []).some((c) => c?.name === 'sort_order');
    if (!hasSortOrder) {
      await db.execAsync(`ALTER TABLE sections ADD COLUMN sort_order INTEGER DEFAULT 0;`);
    }
    await db.runAsync(`UPDATE sections SET sort_order = id WHERE sort_order IS NULL OR sort_order = 0;`);
  };

  if (currentVersion !== DB_VERSION) {
    console.log(`⚙️ Database version change detected: ${currentVersion} → ${DB_VERSION}`);

    // 执行所有建表语句
    for (const sql of CREATE_TABLES_SQL) {
      await db.execAsync(sql);
    }

    await ensureSectionsSortOrder();

    await db.runAsync(`INSERT OR REPLACE INTO db_meta (key, value) VALUES ('db_version', ?);`, [DB_VERSION]);

    console.log('✅ Schema updated successfully');

  } else {
    console.log('✅ Database is up to date');
    await ensureSectionsSortOrder();
  }

  await db.runAsync(
    `INSERT OR IGNORE INTO sections (id, type, name, temperature, icon, sort_order) VALUES (?, ?, ?, ?, ?, ?);`,
    [1, 'freezer', '冷冻区', -18, '❄️', 1]
  );
  await db.runAsync(
    `INSERT OR IGNORE INTO sections (id, type, name, temperature, icon, sort_order) VALUES (?, ?, ?, ?, ?, ?);`,
    [2, 'fridge', '冷藏区', 4, '🧊', 2]
  );

  return db;
};
