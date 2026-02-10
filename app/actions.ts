"use server";
import mysql from 'mysql2/promise';

/**
 * Enhanced connection helper with specific error reporting
 */
async function createConn(formData: FormData) {
  try {
    return await mysql.createConnection({
      host: formData.get("ip") as string,
      user: formData.get("dbUser") as string,
      password: formData.get("dbPassword") as string,
      database: formData.get("dbName") as string,
      connectTimeout: 5000, // Faster timeout for better UX
    });
  } catch (error: any) {
    if (error.code === 'ER_ACCESS_DENIED_ERROR') throw new Error("Incorrect DB Username or Password.");
    if (error.code === 'ENOTFOUND' || error.code === 'ETIMEDOUT') throw new Error("Database host/IP is unreachable.");
    if (error.code === 'ER_BAD_DB_ERROR') throw new Error("Database name does not exist.");
    throw error;
  }
}

export async function getInitialIds(formData: FormData) {
  const tables = ['bill_1', 'pt_bill_1', 'classes_bill_1'];
  const initialIds: Record<string, number> = {};

  try {
    const connection = await createConn(formData);
    for (const table of tables) {
      try {
        // Detect primary key dynamically
        const [columns]: any = await connection.query('SHOW KEYS FROM ?? WHERE Key_name = "PRIMARY"', [table]);
        const pk = columns.length > 0 ? columns[0].Column_name : 'id';
        const [rows]: any = await connection.query(`SELECT MAX(??) as maxId FROM ??`, [pk, table]);
        initialIds[table] = rows[0].maxId || 0;
      } catch (e) { initialIds[table] = 0; }
    }
    await connection.end();
    return { success: true, initialIds };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function getDatabaseTables(formData: FormData) {
  try {
    const connection = await createConn(formData);
    const [rows]: any = await connection.query('SHOW TABLES');
    await connection.end();
    return { success: true, tables: rows.map((row: any) => Object.values(row)[0]) };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function getTableData(formData: FormData, tableName: string) {
  try {
    const connection = await createConn(formData);
    // Generic SELECT without ORDER BY to avoid "Unknown Column" crashes
    const [rows]: any = await connection.query('SELECT * FROM ?? LIMIT 100', [tableName]);
    await connection.end();
    return { success: true, data: rows };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function checkForNewEntries(formData: FormData, lastIds: Record<string, number>) {
  const tables = ['bill_1', 'pt_bill_1', 'classes_bill_1'];
  const newEntries: { tableName: string; data: any; pkField: string }[] = [];

  try {
    const connection = await createConn(formData);
    for (const table of tables) {
      try {
        const [columns]: any = await connection.query('SHOW KEYS FROM ?? WHERE Key_name = "PRIMARY"', [table]);
        const pk = columns.length > 0 ? columns[0].Column_name : 'id';

        const [rows]: any = await connection.query(
          `SELECT * FROM ?? WHERE ?? > ? ORDER BY ?? ASC`, 
          [table, pk, lastIds[table] || 0, pk]
        );

        rows.forEach((row: any) => {
          newEntries.push({ tableName: table, data: row, pkField: pk });
        });
      } catch (e) { continue; }
    }
    await connection.end();
    return { success: true, newEntries };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}