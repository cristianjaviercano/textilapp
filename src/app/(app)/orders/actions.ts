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
    // To properly update, we should read the existing orders and merge/add the new ones.
    let existingOrders: ProductionOrder[] = [];
    try {
      const fileData = await fs.readFile(ordersFilePath, 'utf-8');
      existingOrders = JSON.parse(fileData);
    } catch (error) {
      // If file doesn't exist, we'll just write a new one.
      console.log("Orders file not found, creating a new one.");
    }

    const updatedOrdersMap = new Map<string, ProductionOrder>();

    // First, add all existing orders to the map
    existingOrders.forEach(order => updatedOrdersMap.set(order.id, order));

    // Then, iterate through the new orders from the client.
    // This will add new orders and overwrite existing ones with new data.
    orders.forEach(order => updatedOrdersMap.set(order.id, order));

    const finalOrders = Array.from(updatedOrdersMap.values());
    
    const data = JSON.stringify(finalOrders, null, 2);
    await fs.writeFile(ordersFilePath, data, 'utf-8');
    
    revalidatePath('/(app)/orders', 'page');
    revalidatePath('/(app)/scheduling', 'page');
    revalidatePath('/(app)/reports', 'page');

    console.log("Orders data save successful.");
    return { success: true };
  } catch (e) {
    const error = e instanceof Error ? e.message : "An unknown error occurred";
    console.error("Error saving Orders data:", error);
    return { success: false, error };
  }
}
