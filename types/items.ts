export type Item = {
  id: number;
  name: string;
  quantity?: number;
  unit?: string;
  category_id?: number | null;
  section_id?: number | null;
  expiry_date?: string | null;
  note?: string | null;
  created_at?: string;
  updated_at?: string;
};

export type Section = {
  id?: number;
  type: string;
  name?: string | null;
  temperature?: number | null;
  icon?: string | null;
};

export type Category = {
  id?: number;
  name: string;
  icon?: string | null;
};

export type ShoppingItem = {
  id?: number;
  name: string;
  quantity?: number;
  is_purchased?: number; // 0/1
};

// export async function getItems(): Promise<Item[]> {
//   const allRows = await db.getAllAsync<Item>('SELECT * FROM items');
//   for (const row of allRows) {
//     console.log(row.id, row.name);
//   }
//   return allRows || [];
// }