"use server";
import mysql, { Connection } from "mysql2/promise";
import { prisma } from "@/lib/prisma";
import { handleAutomatedWhatsApp } from "./whatsapp-actions";

/**
 * Dynamic Variable Mapper: Maps SQL columns to Template Parameters {{1}}, {{2}}...
 * Based on rule event types.
 */
function getDynamicParams(eventType: string, data: any): any[] {
  const params = [];
  // Standard Variable {{1}}: Customer Name
  params.push({ type: "text", text: data.name || "Valued Customer" });

  if (eventType === "New bill" || eventType.includes("Feedback")) {
    params.push({ type: "text", text: "Mr. Algo Cracker Salon" }); // {{2}}
    params.push({ type: "text", text: data.net_amt?.toString() || "0" }); // {{3}}
    params.push({ type: "text", text: data.updatetime || "" }); // {{4}}
  } else if (eventType.toLowerCase().includes("appointment")) {
    params.push({ type: "text", text: "Mr. Algo Cracker Salon" }); // {{2}}
    params.push({ type: "text", text: data.details || "Service" }); // {{3}}
    params.push({ type: "text", text: data.appdate || "" }); // {{4}}
    params.push({ type: "text", text: data.itime || "" }); // {{5}}
  }
  
  return [{ type: "body", parameters: params }];
}

export async function processTenantAutomation(tenantId: string) {
  // 1. Fetch Tenant and their ACTIVE logic rules
  const tenant = await prisma.tenant.findUnique({ 
    where: { id: tenantId },
    include: { automationRules: { where: { isActive: true } } } 
  });
  
  if (!tenant) throw new Error("Tenant configuration not found");
  if (tenant.automationRules.length === 0) return { success: true, count: 0, message: "No active rules" };

  let remoteDb: Connection | undefined;

  try {
    console.log(`\n🔍 --- MONITORING CYCLE START: ${tenant.businessName} ---`);
    
    remoteDb = await mysql.createConnection({
      host: tenant.dbHost,
      user: tenant.dbUser,
      password: tenant.dbPassword,
      database: tenant.dbName,
      port: parseInt(tenant.dbPort || "3306"),
      connectTimeout: 5000,
    });

    // 2. Table Verification
    const requiredTables = [
      'client', 'app_invoice_1', 'invoice_1', 
      'customer_reward_points', 'membership_discount_history', 'service_reminder'
    ];
    
    const existingTables: string[] = [];
    for (const table of requiredTables) {
      const [rows]: any = await remoteDb.query(`SHOW TABLES LIKE '${table}'`);
      if (Array.isArray(rows) && rows.length > 0) existingTables.push(table);
    }

    const now = new Date();
    const lookback5m = new Date(now.getTime() - 5 * 60000).toISOString().slice(0, 19).replace('T', ' ');
    const reminderTarget = new Date(now.getTime() + 30 * 60000).toTimeString().slice(0, 8);
    const detectedEvents: any[] = [];

    // --- HELPERS ---
    const getBestDateColumn = async (db: Connection, table: string) => {
      const [cols]: any = await db.query(`SHOW COLUMNS FROM ${table}`);
      const colNames = cols.map((c: any) => c.Field.toLowerCase());
      const priorities = ['updatetime', 'updated_at', 'entry_date', 'created_at', 'doa'];
      return priorities.find(p => colNames.includes(p)) || null;
    };

    const getCustomer = async (db: Connection, clientId: any) => {
      if (!clientId) return { name: "Valued Customer", phone: "N/A" };
      const [rows]: any = await db.execute(`SELECT name, cont, phone, mobile FROM client WHERE id = ?`, [clientId]);
      const c = rows[0];
      return c ? { 
        name: c.name || "Valued Customer", 
        phone: c.cont || c.phone || c.mobile || "N/A" 
      } : { name: "Valued Customer", phone: "N/A" };
    };

    // 🚀 --- EXECUTION LOGIC ---
    const executeRule = async (eventType: string, data: any) => {
      // Match event to saved rules
      const rules = tenant.automationRules.filter(r => r.eventType === eventType);
      
      for (const rule of rules) {
        // Deduplication: Ensure message isn't sent twice
        const alreadySent = await prisma.automationLog.findFirst({
          where: { tenantId, externalId: data.id.toString(), ruleId: rule.id }
        });

        if (!alreadySent) {
          const components = getDynamicParams(eventType, data);
          const phone = data.phone;

          // Dispatch real WhatsApp via Meta
          const result = await handleAutomatedWhatsApp(tenant, rule.templateName, components, phone);

          if (result.success) {
            await prisma.automationLog.create({
              data: { tenantId, ruleId: rule.id, externalId: data.id.toString(), status: "SENT" }
            });
            console.log(`✅ SENT: ${rule.templateName} to ${data.name}`);
          }
        }
      }
    };

    // --- 🚀 DETECTION HUB ---

    // EVENTS 1, 2, 3: Appointments
    if (existingTables.includes('app_invoice_1')) {
      const dateCol = await getBestDateColumn(remoteDb, 'app_invoice_1');
      if (dateCol) {
        const [appts]: any = await remoteDb.execute(`SELECT * FROM app_invoice_1 WHERE ${dateCol} >= ?`, [lookback5m]);
        for (const a of appts) {
          const client = await getCustomer(remoteDb, a.client);
          const fullData = { ...a, ...client };
          let type = (a.status === 'cancelled' || a.is_cancelled == 1) ? 'Appointment cancel' : (a.status === 'rescheduled' ? 'Appointment re-schedule' : 'New appointment');
          
          console.log(`✨ [IDENTIFIED] ${type}: ID ${a.id} for ${client.name}`);
          detectedEvents.push({ event: type, data: fullData });
          await executeRule(type, fullData);
        }
      }

      // EVENT 4: 30-Min Reminder Logic
      const [rems]: any = await remoteDb.execute(
        `SELECT * FROM app_invoice_1 WHERE appdate = CURDATE() AND itime <= ? AND itime > CURTIME() AND status != 'cancelled'`,
        [reminderTarget]
      );
      for (const r of rems) {
        const client = await getCustomer(remoteDb, r.client);
        const fullData = { ...r, ...client };
        console.log(`⏰ [TRIGGER] 30-MIN REMINDER: Appt ${r.id} for ${client.name}`);
        detectedEvents.push({ event: 'Appointment reminder before 30 mins of appopintment', data: fullData });
        await executeRule('Appointment reminder before 30 mins of appopintment', fullData);
      }
    }

    // EVENTS 5 & 8: New Bill & Feedback
    if (existingTables.includes('invoice_1')) {
      const dateCol = await getBestDateColumn(remoteDb, 'invoice_1');
      if (dateCol) {
        const [bills]: any = await remoteDb.execute(`SELECT * FROM invoice_1 WHERE ${dateCol} >= ?`, [lookback5m]);
        for (const b of bills) {
          const client = await getCustomer(remoteDb, b.client);
          const fullData = { ...b, ...client };
          console.log(`✨ [IDENTIFIED] NEW_BILL & FEEDBACK: ID ${b.id} for ${client.name}`);
          
          detectedEvents.push({ event: 'New bill', data: fullData });
          await executeRule('New bill', fullData);

          detectedEvents.push({ event: 'Feedback after 2 mins of new bill generation', data: fullData });
          await executeRule('Feedback after 2 mins of new bill generation', fullData);
        }
      }
    }

    // EVENT 6: Reward Points
    if (existingTables.includes('customer_reward_points')) {
      const dateCol = await getBestDateColumn(remoteDb, 'customer_reward_points');
      if (dateCol) {
        const [points]: any = await remoteDb.execute(`SELECT * FROM customer_reward_points WHERE ${dateCol} >= ? AND point_type = 1`, [lookback5m]);
        for (const p of points) {
          const client = await getCustomer(remoteDb, p.client_id || p.client);
          const fullData = { ...p, ...client };
          detectedEvents.push({ event: 'Reward points granted / earned', data: fullData });
          await executeRule('Reward points granted / earned', fullData);
        }
      }
    }

    // EVENT 7: Membership Buy
    if (existingTables.includes('membership_discount_history')) {
      const dateCol = await getBestDateColumn(remoteDb, 'membership_discount_history');
      if (dateCol) {
        const [mems]: any = await remoteDb.execute(`SELECT * FROM membership_discount_history WHERE ${dateCol} >= ?`, [lookback5m]);
        for (const m of mems) {
          const client = await getCustomer(remoteDb, m.client_id || m.client);
          const fullData = { ...m, ...client };
          detectedEvents.push({ event: 'membership buy', data: fullData });
          await executeRule('membership buy', fullData);
        }
      }
    }

    // EVENT 9: Service Reminder
    if (existingTables.includes('service_reminder')) {
      const dateCol = await getBestDateColumn(remoteDb, 'service_reminder');
      if (dateCol) {
        const [reminders]: any = await remoteDb.execute(`SELECT * FROM service_reminder WHERE ${dateCol} >= ?`, [lookback5m]);
        for (const sr of reminders) {
          const client = await getCustomer(remoteDb, sr.client_id || sr.client);
          const fullData = { ...sr, ...client };
          detectedEvents.push({ event: 'Service reminder', data: fullData });
          await executeRule('Service reminder', fullData);
        }
      }
    }

    await remoteDb.end();
    console.log(`\n📊 CYCLE COMPLETE: Total ${detectedEvents.length} events processed.\n`);
    return { success: true, count: detectedEvents.length, entries: detectedEvents };

  } catch (error: any) {
    console.error(`💥 CRITICAL ERROR: ${error.message}`);
    if (remoteDb) await remoteDb.end();
    return { success: false, error: error.message };
  }
}