import { NextResponse } from "next/server";
// 🔹 UPDATE: Import from 'automation-engine', not 'automation-logic'
import { processTenantAutomation } from "@/app/actions/automation-engine";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const startTime = Date.now();
  console.log("\n🚀 --- GLOBAL SYNC START ---");

  try {
    const tenants = await prisma.tenant.findMany({ select: { id: true, business_name: true } });
    console.log(`📡 Found ${tenants.length} tenants in database.`);
    
    for (const tenant of tenants) {
      console.log(`\n⏳ Syncing: ${tenant.business_name} (${tenant.id})`);
      await processTenantAutomation(tenant.id);
    }

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(`\n✅ --- SYNC COMPLETE (${duration}s) ---\n`);

    return NextResponse.json({ success: true, message: `Sync Completed in ${duration}s` });
  } catch (error: any) {
    console.error("\n❌ GLOBAL SYNC ERROR:", error.message);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}