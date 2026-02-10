// app/api/tenants/[id]/whatsapp/templates/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request, { params }: { params: { id: string } }) {
  try {
    const tenant = await prisma.tenant.findUnique({
      where: { id: params.id },
      select: { metaToken: true, phoneNumberId: true }
    });

    if (!tenant?.metaToken || !tenant?.phoneNumberId) {
      return NextResponse.json({ success: false, error: "Credentials missing" }, { status: 400 });
    }

    const response = await fetch(
      `https://graph.facebook.com/v18.0/${tenant.phoneNumberId}/message_templates?limit=500`,
      { headers: { Authorization: `Bearer ${tenant.metaToken}` } }
    );

    const data = await response.json();
    if (data.error) return NextResponse.json({ success: false, error: data.error.message }, { status: 500 });
    
    const approvedTemplates = data.data?.filter((t: any) => t.status === "APPROVED") || [];
    return NextResponse.json({ success: true, templates: approvedTemplates });
  } catch (error) {
    return NextResponse.json({ success: false, error: "API Failure" }, { status: 500 });
  }
}