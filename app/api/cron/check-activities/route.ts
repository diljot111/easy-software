import { prisma } from "@/lib/prisma";
import { processTenantAutomation } from "../../../actions/automation-engine";

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const tenants = await prisma.tenant.findMany({
      where: { NOT: { dbHost: "" } }
    });

    const report = [];
    for (const tenant of tenants) {
      const result = await processTenantAutomation(tenant.id);
      report.push({ tenant: tenant.businessName, ...result });
    }

    // Returns the identification report to your browser for testing
    return Response.json({ 
      success: true, 
      developer_log: "Identification of new entries completed",
      report 
    });

  } catch (error: any) {
    return Response.json({ success: false, error: error.message }, { status: 500 });
  }
}