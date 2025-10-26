"use server";

import { revalidatePath } from "next/cache";
import type { ProductionOrder } from "@/lib/types";
import fs from "fs/promises";
import path from "path";

const ordersFilePath = path.join(process.cwd(), 'src', 'data', 'orders.json');

export async function saveOrdersData(orders: ProductionOrder[]): Promise<{
  success: boolean;
  error?: string;
}> {
  console.log("Saving Orders data...", orders.length, "records");

  try {
    const data = JSON.stringify(orders, null, 2);
    await fs.writeFile(ordersFilePath, data, 'utf-8');
    
    revalidatePath('/(app)/orders', 'page');
    revalidatePath('/(app)/scheduling', 'page');

    console.log("Orders data save successful.");
    return { success: true };
  } catch (e) {
    const error = e instanceof Error ? e.message : "An unknown error occurred";
    console.error("Error saving Orders data:", error);
    return { success: false, error };
  }
}
