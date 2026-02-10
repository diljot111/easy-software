"use server";
import { prisma } from "@/lib/prisma";

/**
 * Fetches all table names from the MySQL database.
 * Prisma 7/6 doesn't have a direct 'show tables' command, so we use $queryRaw.
 */
export async function getDatabaseTables() {
  try {
    const tables: any[] = await prisma.$queryRaw`SHOW TABLES`;
    return { 
      success: true, 
      tables: tables.map((row) => Object.values(row)[0] as string) 
    };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * Fetches the current Max ID for the specific billing tables.
 * This is used to "initialize" the watcher so you don't get spammed with old data.
 */
export async function getInitialIds() {
  const tables = ['bill_1', 'pt_bill_1', 'classes_bill_1'];
  const initialIds: Record<string, number> = {};

  try {
    for (const table of tables) {
      // We look for the primary key column (usually 'id')
      const result: any[] = await prisma.$queryRawUnsafe(
        `SELECT MAX(id) as maxId FROM ${table}`
      );
      initialIds[table] = result[0]?.maxId || 0;
    }
    return { success: true, initialIds };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * Fetches the latest 100 rows for a specific table for the UI view.
 */
export async function getTableData(tableName: string) {
  try {
    const data: any[] = await prisma.$queryRawUnsafe(
      `SELECT * FROM ${tableName} LIMIT 100`
    );
    return { success: true, data };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * The "Heartbeat" function. Checks if any new IDs have appeared 
 * that are higher than the ones we last saw.
 */
export async function checkForNewEntries(formData: FormData, lastIds: Record<string, number>) {
  const tables = ['bill_1', 'pt_bill_1', 'classes_bill_1'];
  const newEntries: { tableName: string; data: any; pkField: string }[] = [];

  try {
    for (const table of tables) {
      const lastId = lastIds[table] || 0;
      
      // Query for any rows with an ID greater than the last one we saw
      const rows: any[] = await prisma.$queryRawUnsafe(
        `SELECT * FROM ${table} WHERE id > ${lastId} ORDER BY id ASC`
      );

      if (rows.length > 0) {
        rows.forEach((row) => {
          newEntries.push({ 
            tableName: table, 
            data: row, 
            pkField: 'id' 
          });
        });
      }
    }
    return { success: true, newEntries };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}