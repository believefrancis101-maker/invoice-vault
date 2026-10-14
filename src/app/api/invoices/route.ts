import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth/session";
import { createInvoiceSchema } from "@/lib/validation/invoice";

/**
 * GET /api/invoices
 * Lists the authenticated user's invoices.
 * Enforces ownership in the query: `where: { userId: user.id }`.
 * Strips internal database IDs to protect system internals.
 */
export async function GET() {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const invoices = await prisma.invoice.findMany({
      where: {
        userId: user.id,
      },
      orderBy: {
        createdAt: "desc",
      },
      select: {
        publicId: true,
        invoiceNumber: true,
        clientName: true,
        description: true,
        amountKobo: true,
        issueDate: true,
        status: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return NextResponse.json({ invoices }, { status: 200 });
  } catch (error) {
    console.error("GET /api/invoices error:", error);
    return NextResponse.json(
      { error: "Failed to fetch invoices" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/invoices
 * Creates an invoice scoped to the authenticated user.
 * Validates request body, assigns user.id from session,
 * and handles duplicate invoice number conflicts.
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return NextResponse.json(
        { error: "Invalid request payload" },
        { status: 400 }
      );
    }

    const parseResult = createInvoiceSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json(
        {
          error: "Validation failed",
          details: parseResult.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    const { invoiceNumber, clientName, description, amountKobo, issueDate, status } =
      parseResult.data;

    try {
      const invoice = await prisma.invoice.create({
        data: {
          invoiceNumber,
          clientName,
          description: description || null,
          amountKobo,
          issueDate,
          status,
          userId: user.id, // Strictly derived from session
        },
        select: {
          publicId: true,
          invoiceNumber: true,
          clientName: true,
          description: true,
          amountKobo: true,
          issueDate: true,
          status: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      return NextResponse.json({ invoice }, { status: 201 });
    } catch (dbError: unknown) {
      const isPrismaP2002 =
        typeof dbError === "object" &&
        dbError !== null &&
        "code" in dbError &&
        (dbError as { code: string }).code === "P2002";

      if (isPrismaP2002) {
        return NextResponse.json(
          {
            error: "An invoice with this invoice number already exists.",
            details: { invoiceNumber: ["Invoice number must be unique."] },
          },
          { status: 409 }
        );
      }

      throw dbError;
    }
  } catch (error) {
    console.error("POST /api/invoices error:", error);
    return NextResponse.json(
      { error: "Failed to create invoice" },
      { status: 500 }
    );
  }
}
