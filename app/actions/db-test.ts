"use server";

import mysql from "mysql2/promise";

export async function testRemoteConnection(formData: FormData) {
  const host = formData.get("host") as string;
  const user = formData.get("user") as string;
  const database = formData.get("database") as string;
  const password = formData.get("password") as string;
  const port = parseInt(formData.get("port") as string) || 3306;

  try {
    const connection = await mysql.createConnection({
      host,
      user,
      password,
      database,
      port,
      connectTimeout: 10000,
    });

    // Fetch table names to prove connection works
    const [rows]: [any[], any] = await connection.query(`SHOW TABLES FROM ${database}`);
    const tableNames = rows.map((row) => Object.values(row)[0]);

    await connection.end();

    return { 
      success: true, 
      tables: tableNames, 
      message: "Successfully connected to remote database." 
    };
  } catch (error: any) {
    return { 
      success: false, 
      error: error.message || "Failed to connect to database." 
    };
  }
}