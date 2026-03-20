// src/services/itemService.ts
import * as SQLite from 'expo-sqlite';
import { Item } from '../types/items';



export async function getItemById(id: number): Promise<Item | null> {
  const db = SQLite.useSQLiteContext();
  const row = await db.getFirstAsync<Item>('SELECT * FROM items WHERE id = ?;', [id]);
  return row || null;
}
