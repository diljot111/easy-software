// app/api/tenants/[id]/whatsapp/templates/route.ts
import { NextResponse, NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";

// ✅ FIX 1: Use NextRequest and properly typed Promise for params
export async function GET(
  request: NextRequest, 
  { params }: { params: Promise<{ id: string }> } 
) {
  try {
    // ✅ FIX 2: Await the params object
    const awaitedParams = await params;
    const stringId = awaitedParams.id;

    // ✅ FIX 3: Convert String ID to Number for Prisma
    const tenantId = Number(stringId);

    if (isNaN(tenantId)) {
      return NextResponse.json({ success: false, error: "Invalid Tenant ID format" }, { status: 400 });
    }

    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId }, // Use the converted Number
      select: { 
        meta_token: true, 
        phone_number_id: true 
      }
    });

    if (!tenant?.meta_token || !tenant?.phone_number_id) {
      return NextResponse.json({ 
        success: false, 
        error: "WhatsApp API credentials (Token or Phone ID) are missing for this tenant." 
      }, { status: 400 });
    }

    // Fetch templates from Meta Graph API
    const response = await fetch(
      `https://graph.facebook.com/v18.0/${tenant.phone_number_id}/message_templates?limit=500`,
      { 
        headers: { Authorization: `Bearer ${tenant.meta_token}` },
        next: { revalidate: 60 } // Optional: Cache results for 60 seconds
      }
    );

    const data = await response.json();
    
    if (data.error) {
      return NextResponse.json({ 
        success: false, 
        error: data.error.message 
      }, { status: 500 });
    }
    
    // Filter for only APPROVED templates
    const approvedTemplates = data.data?.filter((t: any) => t.status === "APPROVED") || [];
    
    return NextResponse.json({ 
      success: true, 
      templates: approvedTemplates 
    });

  } catch (error: any) {
    console.error("Template Fetch Error:", error);
    return NextResponse.json({ 
      success: false, 
      error: "Internal Server Error" 
    }, { status: 500 });
  }
}