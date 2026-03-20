// src/database/schema.ts

export const DB_VERSION = '1.0.1'; // 每次修改表结构时手动递增

// 所有表的 CREATE TABLE SQL
export const CREATE_TABLES_SQL = [
  // Fridge Items Table
  `CREATE TABLE IF NOT EXISTS items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,          -- Unique ID of the item
    name TEXT NOT NULL,                            -- Item name (e.g., Milk, Egg)
    quantity REAL DEFAULT 1,                       -- Quantity of the item
    unit TEXT DEFAULT 'pcs',                       -- Unit of measurement (pcs, g, ml, etc.)
    category_id INTEGER,                           -- Reference to categories(id)
    section_id INTEGER,                            -- Reference to sections(id)
    expiry_date TEXT,                              -- Expiry or best-before date
    note TEXT,                                     -- Optional note (e.g., brand, reminder)
    created_at TEXT DEFAULT (datetime('now')),     -- Timestamp when the item was created
    updated_at TEXT DEFAULT (datetime('now'))      -- Timestamp when the item was last updated
  );`,

  // Fridge Sections Table
  `CREATE TABLE IF NOT EXISTS sections (
    id INTEGER PRIMARY KEY AUTOINCREMENT,          -- Unique ID of the section
    type TEXT NOT NULL,                            -- Section type: freezer / fridge / vegetable
    name TEXT,                                     -- Optional custom name for the section
    temperature REAL,                              -- Default or user-set temperature (°C)
    icon TEXT,                                     -- Optional icon or image reference
    sort_order INTEGER DEFAULT 0,                  -- Display order for sections
    created_at TEXT DEFAULT (datetime('now'))      -- Timestamp when the section was created
  );`,

  // Item Categories Table
  `CREATE TABLE IF NOT EXISTS categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,          -- Unique ID of the category
    name TEXT NOT NULL,                            -- Category name (e.g., Fruits, Meat)
    icon TEXT                                      -- Optional icon or emoji representing the category
  );`,

  // Shopping List Table
  `CREATE TABLE IF NOT EXISTS shopping_list (
    id INTEGER PRIMARY KEY AUTOINCREMENT,          -- Unique ID of the shopping list item
    name TEXT NOT NULL,                            -- Name of the item to purchase
    quantity REAL DEFAULT 1,                       -- Desired quantity to buy
    is_purchased INTEGER DEFAULT 0                 -- 0 = not purchased, 1 = purchased
  );`,

  // Settings Table
  `CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,                          -- Setting key name (unique)
    value TEXT                                     -- Stored value (stringified)
  );`,

  // Meta Table
  `CREATE TABLE IF NOT EXISTS db_meta (
    key TEXT PRIMARY KEY,
    value TEXT
  );`
];
