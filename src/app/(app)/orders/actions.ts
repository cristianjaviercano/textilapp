"use client";

import type { ProductionOrder } from "@/lib/types";

// NOTE: This is now a client-side function simulating a server action.
// In a true static offline build, we cannot write back to the filesystem.
// This function will operate on in-memory data passed to it.
export async function saveOrdersData(orders: ProductionOrder[]): Promise<{
  success: boolean;
  error?: string;
}> {
  console.log("Simulating client-side Orders data save...", orders.length, "records");

  // In a true offline static app, data persistence would be handled
  // via browser storage (localStorage/IndexedDB) or by letting the user
  // download the updated file. For this simulation, we just return success.

  if (orders === null) {
    return { success: false, error: "No order data provided." };
  }
  
  try {
    // This action now simply confirms the data is valid in memory.
    // The state is managed entirely within the client components.
    console.log("Orders data save simulation successful.");
    return { success: true };
  } catch (e) {
    const error = e instanceof Error ? e.message : "An unknown error occurred";
    console.error("Error saving Orders data (simulation):", error);
    return { success: false, error };
  }
}
