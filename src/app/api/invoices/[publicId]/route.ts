import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth/session";

interface RouteParams {
  params: Promise<{
    publicId: string;
  }>;
}

/**
 * GET /api/invoices/[publicId]
 * Retrieves a single invoice scoped to the authenticated owner.
 * Returns 401 if unauthenticated.
 * Returns 404 if the invoice does not exist OR belongs to another user.
 * Strips internal database IDs.
 */
export async function GET(
  _request: NextRequest,
  { params }: RouteParams
) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { publicId } = await params;

    if (!publicId) {
      return NextResponse.json(
        { error: "Invalid invoice identifier" },
        { status: 400 }
      );
    }

    // Ownership enforced in the query itself
    const invoice = await prisma.invoice.findFirst({
      where: {
        publicId,
        userId: user.id,
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

    if (!invoice) {
      // 404 protects both non-existent invoices and another user's invoices
      return NextResponse.json(
        { error: "Invoice not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ invoice }, { status: 200 });
  } catch (error) {
    console.error("GET /api/invoices/[publicId] error:", error);
    return NextResponse.json(
      { error: "Failed to retrieve invoice" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/invoices/[publicId]
 * Atomically creates an audit record and deletes the invoice.
 * Enforces ownership in the query.
 * If the invoice does not exist or belongs to another user, returns 404
 * without mutating database or creating false audit records.
 * Replays return 404 safely.
 */
export async function DELETE(
  _request: NextRequest,
  { params }: RouteParams
) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { publicId } = await params;

    if (!publicId) {
      return NextResponse.json(
        { error: "Invalid invoice identifier" },
        { status: 400 }
      );
    }

    // Run audit creation and invoice deletion in an atomic transaction
    const deletionResult = await prisma.$transaction(async (tx) => {
      // 1. Ownership check in query
      const invoice = await tx.invoice.findFirst({
        where: {
          publicId,
          userId: user.id,
        },
      });

      if (!invoice) {
        return null;
      }

      // 2. Create the audit trail record inside the transaction
      // AuditLog does not cascade on Invoice deletion, ensuring survival
      await tx.auditLog.create({
        data: {
          actorUserId: user.id,
          action: "INVOICE_DELETED",
          entityType: "INVOICE",
          entityPublicId: invoice.publicId,
          entityLabel: invoice.invoiceNumber,
          details: JSON.stringify({
            clientName: invoice.clientName,
            amountKobo: invoice.amountKobo,
            status: invoice.status,
          }),
        },
      });

      // 3. Delete the invoice record
      await tx.invoice.delete({
        where: {
          id: invoice.id,
        },
      });

      return {
        publicId: invoice.publicId,
        invoiceNumber: invoice.invoiceNumber,
      };
    });

    if (!deletionResult) {
      return NextResponse.json(
        { error: "Invoice not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        message: "Invoice deleted successfully",
        invoice: deletionResult,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("DELETE /api/invoices/[publicId] error:", error);
    return NextResponse.json(
      { error: "Failed to delete invoice" },
      { status: 500 }
    );
  }
}
