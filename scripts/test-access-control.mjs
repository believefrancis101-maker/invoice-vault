/**
 * Automated Access Control & Security Invariant Test Suite
 *
 * Verifies all 8 core assessment requirements for InvoiceVault:
 * 1. User A can list and view User A's invoices.
 * 2. User B cannot view User A's invoice by changing the public identifier (returns 404).
 * 3. User B cannot delete User A's invoice (returns 404, record preserved).
 * 4. Unauthenticated users cannot use protected endpoints (returns 401).
 * 5. Replayed delete requests do not delete additional records or create misleading audit events.
 * 6. A successful deletion creates an audit event that survives deletion.
 * 7. Invalid invoice input is rejected (returns 400).
 * 8. Internal database IDs are not exposed through invoice URLs or UI.
 */

import { PrismaClient } from "@prisma/client";
import crypto from "crypto";

const prisma = new PrismaClient();
const BASE_URL = process.env.TEST_APP_URL || "http://localhost:3000";

let passedCount = 0;
let failedCount = 0;

function assert(condition, testName, details = "") {
  if (condition) {
    console.log(`  [PASS] ${testName}`);
    passedCount++;
  } else {
    console.error(`  [FAIL] ${testName} - ${details}`);
    failedCount++;
  }
}

function hashSessionToken(rawToken) {
  return crypto.createHash("sha256").update(rawToken).digest("hex");
}

async function createAuthenticatedUser(name, emailPrefix) {
  const email = `${emailPrefix}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}@test.local`;
  const user = await prisma.user.create({
    data: {
      name,
      email,
      passwordHash: "$2b$12$eX4mpleH4shUsedOnlyForTestRunnersXXXXXXXXXXXXXXX",
      emailVerified: true,
    },
  });

  const rawToken = crypto.randomBytes(32).toString("hex");
  const tokenHash = hashSessionToken(rawToken);
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

  await prisma.session.create({
    data: {
      sessionToken: tokenHash,
      userId: user.id,
      expiresAt,
    },
  });

  return {
    user,
    cookie: `auth_session=${rawToken}`,
  };
}

async function runTests() {
  console.log("===============================================================");
  console.log(" INVOICEVAULT: ACCESS CONTROL & AUTHORIZATION TEST SUITE");
  console.log(` Target Server: ${BASE_URL}`);
  console.log("===============================================================\n");

  let userA, userB;

  try {
    // ------------------------------------------------------------------------
    // Setup: Provision distinct test actors
    // ------------------------------------------------------------------------
    console.log("[Setup] Provisioning User A and User B with active sessions...");
    userA = await createAuthenticatedUser("User Alpha", "usera");
    userB = await createAuthenticatedUser("User Beta", "userb");
    console.log(`  User A ID: ${userA.user.id} (${userA.user.email})`);
    console.log(`  User B ID: ${userB.user.id} (${userB.user.email})\n`);

    // ------------------------------------------------------------------------
    // REQUIREMENT 4: Unauthenticated users cannot use protected endpoints (401)
    // ------------------------------------------------------------------------
    console.log("--- Requirement 4: Unauthenticated Access Guard ---");

    const unauthGetInvoices = await fetch(`${BASE_URL}/api/invoices`);
    assert(
      unauthGetInvoices.status === 401,
      "GET /api/invoices unauthenticated receives 401",
      `Expected 401, got ${unauthGetInvoices.status}`
    );

    const unauthPostInvoice = await fetch(`${BASE_URL}/api/invoices`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ invoiceNumber: "UNAUTH-1", clientName: "Test", amountKobo: 1000 }),
    });
    assert(
      unauthPostInvoice.status === 401,
      "POST /api/invoices unauthenticated receives 401",
      `Expected 401, got ${unauthPostInvoice.status}`
    );

    const unauthGetDetail = await fetch(`${BASE_URL}/api/invoices/random-uuid-12345`);
    assert(
      unauthGetDetail.status === 401,
      "GET /api/invoices/[publicId] unauthenticated receives 401",
      `Expected 401, got ${unauthGetDetail.status}`
    );

    const unauthDelete = await fetch(`${BASE_URL}/api/invoices/random-uuid-12345`, {
      method: "DELETE",
    });
    assert(
      unauthDelete.status === 401,
      "DELETE /api/invoices/[publicId] unauthenticated receives 401",
      `Expected 401, got ${unauthDelete.status}`
    );

    const unauthAudit = await fetch(`${BASE_URL}/api/audit-logs`);
    assert(
      unauthAudit.status === 401,
      "GET /api/audit-logs unauthenticated receives 401",
      `Expected 401, got ${unauthAudit.status}`
    );
    console.log("");

    // ------------------------------------------------------------------------
    // REQUIREMENT 7: Invalid invoice input is rejected (400)
    // ------------------------------------------------------------------------
    console.log("--- Requirement 7: Input Validation & Malformed Payload Rejection ---");

    const invalidInputs = [
      {
        name: "Empty invoice number",
        payload: { invoiceNumber: "", clientName: "Acme", amountKobo: 5000, issueDate: "2026-10-14", status: "DRAFT" },
      },
      {
        name: "Missing client name",
        payload: { invoiceNumber: "INV-VALID-1", clientName: "", amountKobo: 5000, issueDate: "2026-10-14", status: "DRAFT" },
      },
      {
        name: "Negative amountKobo",
        payload: { invoiceNumber: "INV-VALID-2", clientName: "Acme", amountKobo: -500, issueDate: "2026-10-14", status: "DRAFT" },
      },
      {
        name: "Non-integer kobo amount (fractional)",
        payload: { invoiceNumber: "INV-VALID-3", clientName: "Acme", amountKobo: 1250.75, issueDate: "2026-10-14", status: "DRAFT" },
      },
      {
        name: "Invalid status enum value",
        payload: { invoiceNumber: "INV-VALID-4", clientName: "Acme", amountKobo: 5000, issueDate: "2026-10-14", status: "INVALID_STATUS" },
      },
      {
        name: "Invalid issue date format",
        payload: { invoiceNumber: "INV-VALID-5", clientName: "Acme", amountKobo: 5000, issueDate: "not-a-date", status: "DRAFT" },
      },
    ];

    for (const testCase of invalidInputs) {
      const res = await fetch(`${BASE_URL}/api/invoices`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Cookie: userA.cookie,
        },
        body: JSON.stringify(testCase.payload),
      });

      assert(
        res.status === 400,
        `Rejects invalid payload: ${testCase.name}`,
        `Expected 400, got ${res.status}`
      );
    }
    console.log("");

    // ------------------------------------------------------------------------
    // REQUIREMENT 1: User A can create, list, and view User A's invoices
    // ------------------------------------------------------------------------
    console.log("--- Requirement 1: User A Record Lifecycle & Access ---");

    const invoicePayloadA = {
      invoiceNumber: `INV-A-${Date.now().toString().slice(-5)}`,
      clientName: "Zenith Holdings Ltd",
      description: "Q4 Advisory Services & Architecture Audit",
      amountKobo: 25000000, // ₦250,000.00
      issueDate: new Date().toISOString(),
      status: "PENDING",
    };

    const createResA = await fetch(`${BASE_URL}/api/invoices`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: userA.cookie,
      },
      body: JSON.stringify(invoicePayloadA),
    });

    assert(createResA.status === 201, "User A creates invoice with HTTP 201", `Got ${createResA.status}`);
    const createDataA = await createResA.json();
    const invoiceA = createDataA.invoice;

    assert(Boolean(invoiceA?.publicId), "Created invoice returns opaque publicId");
    assert(invoiceA?.invoiceNumber === invoicePayloadA.invoiceNumber, "Created invoice has correct invoiceNumber");

    // REQUIREMENT 8: Internal database ID is NOT exposed in response or URLs
    assert(invoiceA?.id === undefined, "Internal database ID ('id') is NOT exposed in API response");

    // User A lists invoices
    const listResA = await fetch(`${BASE_URL}/api/invoices`, {
      headers: { Cookie: userA.cookie },
    });
    assert(listResA.status === 200, "User A lists invoices with HTTP 200");
    const listDataA = await listResA.json();
    const foundInList = listDataA.invoices.some((inv) => inv.publicId === invoiceA.publicId);
    assert(foundInList, "User A's invoice list contains the newly created invoice");

    // User A views detail
    const detailResA = await fetch(`${BASE_URL}/api/invoices/${invoiceA.publicId}`, {
      headers: { Cookie: userA.cookie },
    });
    assert(detailResA.status === 200, "User A views detail with HTTP 200");
    const detailDataA = await detailResA.json();
    assert(detailDataA.invoice.publicId === invoiceA.publicId, "Detail returns correct invoice by publicId");
    assert(detailDataA.invoice.id === undefined, "Detail does NOT expose internal database ID");
    console.log("");

    // ------------------------------------------------------------------------
    // REQUIREMENT 2: User B cannot view User A's invoice (HTTP 404)
    // ------------------------------------------------------------------------
    console.log("--- Requirement 2: Cross-Tenant Read Isolation ---");

    const userBViewRes = await fetch(`${BASE_URL}/api/invoices/${invoiceA.publicId}`, {
      headers: { Cookie: userB.cookie },
    });
    assert(
      userBViewRes.status === 404,
      "User B accessing User A's invoice receives 404 Not Found (avoids record disclosure)",
      `Expected 404, got ${userBViewRes.status}`
    );

    const userBListRes = await fetch(`${BASE_URL}/api/invoices`, {
      headers: { Cookie: userB.cookie },
    });
    const userBListData = await userBListRes.json();
    const leakedInBList = userBListData.invoices.some((inv) => inv.publicId === invoiceA.publicId);
    assert(!leakedInBList, "User B's invoice list does NOT contain User A's invoice");
    console.log("");

    // ------------------------------------------------------------------------
    // REQUIREMENT 3: User B cannot delete User A's invoice (HTTP 404)
    // ------------------------------------------------------------------------
    console.log("--- Requirement 3: Cross-Tenant Delete Isolation ---");

    const userBDeleteRes = await fetch(`${BASE_URL}/api/invoices/${invoiceA.publicId}`, {
      method: "DELETE",
      headers: { Cookie: userB.cookie },
    });
    assert(
      userBDeleteRes.status === 404,
      "User B attempting to delete User A's invoice receives 404 Not Found",
      `Expected 404, got ${userBDeleteRes.status}`
    );

    // Verify User A's invoice is still in the database intact
    const verifyStillExists = await prisma.invoice.findFirst({
      where: { publicId: invoiceA.publicId, userId: userA.user.id },
    });
    assert(
      Boolean(verifyStillExists),
      "User A's invoice was NOT deleted by User B's unauthorized request"
    );

    // Verify User B did not generate an audit log
    const userBAuditLogs = await prisma.auditLog.findMany({
      where: { actorUserId: userB.user.id },
    });
    assert(
      userBAuditLogs.length === 0,
      "No audit event was recorded for User B's failed deletion attempt"
    );
    console.log("");

    // ------------------------------------------------------------------------
    // REQUIREMENT 6: Successful deletion creates an audit record that survives deletion
    // ------------------------------------------------------------------------
    console.log("--- Requirement 6: Deletion Audit Trail & Survival ---");

    const userADeleteRes = await fetch(`${BASE_URL}/api/invoices/${invoiceA.publicId}`, {
      method: "DELETE",
      headers: { Cookie: userA.cookie },
    });
    assert(
      userADeleteRes.status === 200,
      "User A deletes own invoice with HTTP 200",
      `Expected 200, got ${userADeleteRes.status}`
    );

    // Verify invoice is gone
    const checkInvoiceDeleted = await prisma.invoice.findFirst({
      where: { publicId: invoiceA.publicId },
    });
    assert(checkInvoiceDeleted === null, "Invoice is permanently removed from invoices table");

    // Verify audit record exists and survived
    const auditRecord = await prisma.auditLog.findFirst({
      where: {
        actorUserId: userA.user.id,
        entityPublicId: invoiceA.publicId,
      },
    });
    assert(Boolean(auditRecord), "Audit record exists in database after invoice deletion");
    assert(auditRecord?.action === "INVOICE_DELETED", "Audit record action is INVOICE_DELETED");
    assert(auditRecord?.entityLabel === invoicePayloadA.invoiceNumber, "Audit record preserves invoice number");
    assert(auditRecord?.entityType === "INVOICE", "Audit record entityType is INVOICE");

    // Verify User A can inspect own audit log via API
    const userAAuditRes = await fetch(`${BASE_URL}/api/audit-logs`, {
      headers: { Cookie: userA.cookie },
    });
    assert(userAAuditRes.status === 200, "User A can fetch activity audit logs via API");
    const userAAuditData = await userAAuditRes.json();
    const hasAuditEntry = userAAuditData.auditLogs.some(
      (log) => log.entityPublicId === invoiceA.publicId
    );
    assert(hasAuditEntry, "User A's Activity Log API returns the deletion event");

    // Verify User B cannot see User A's audit records
    const userBAuditRes = await fetch(`${BASE_URL}/api/audit-logs`, {
      headers: { Cookie: userB.cookie },
    });
    const userBAuditData = await userBAuditRes.json();
    const leakedAuditInB = userBAuditData.auditLogs.some(
      (log) => log.entityPublicId === invoiceA.publicId
    );
    assert(!leakedAuditInB, "User B's Activity Log does NOT expose User A's audit event");
    console.log("");

    // ------------------------------------------------------------------------
    // REQUIREMENT 5: Replayed delete requests do not delete or create misleading audits
    // ------------------------------------------------------------------------
    console.log("--- Requirement 5: Replayed Delete Protection & Idempotency ---");

    const auditCountBeforeReplay = await prisma.auditLog.count({
      where: { actorUserId: userA.user.id },
    });

    const replayDeleteRes = await fetch(`${BASE_URL}/api/invoices/${invoiceA.publicId}`, {
      method: "DELETE",
      headers: { Cookie: userA.cookie },
    });
    assert(
      replayDeleteRes.status === 404,
      "Replayed delete returns HTTP 404 Not Found",
      `Expected 404, got ${replayDeleteRes.status}`
    );

    const auditCountAfterReplay = await prisma.auditLog.count({
      where: { actorUserId: userA.user.id },
    });
    assert(
      auditCountAfterReplay === auditCountBeforeReplay,
      "Replayed delete does NOT create duplicate or misleading audit entries"
    );
    console.log("");

    // ------------------------------------------------------------------------
    // Duplicate invoiceNumber uniqueness per-user check
    // ------------------------------------------------------------------------
    console.log("--- Unique Invoice Number per Owner ---");
    const sameNumber = `INV-UNIQUE-${Date.now().toString().slice(-4)}`;

    const firstCreate = await fetch(`${BASE_URL}/api/invoices`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: userA.cookie },
      body: JSON.stringify({
        invoiceNumber: sameNumber,
        clientName: "Client One",
        amountKobo: 100000,
        issueDate: new Date().toISOString(),
        status: "DRAFT",
      }),
    });
    assert(firstCreate.status === 201, "First invoice with number created successfully (201)");

    const duplicateCreate = await fetch(`${BASE_URL}/api/invoices`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: userA.cookie },
      body: JSON.stringify({
        invoiceNumber: sameNumber,
        clientName: "Client Two",
        amountKobo: 200000,
        issueDate: new Date().toISOString(),
        status: "DRAFT",
      }),
    });
    assert(
      duplicateCreate.status === 409,
      "Duplicate invoice number for same user returns 409 Conflict",
      `Expected 409, got ${duplicateCreate.status}`
    );
    console.log("");

  } finally {
    // ------------------------------------------------------------------------
    // Cleanup test resources
    // ------------------------------------------------------------------------
    console.log("[Teardown] Cleaning up test records...");
    if (userA?.user?.id) {
      await prisma.auditLog.deleteMany({ where: { actorUserId: userA.user.id } });
      await prisma.invoice.deleteMany({ where: { userId: userA.user.id } });
      await prisma.session.deleteMany({ where: { userId: userA.user.id } });
      await prisma.user.delete({ where: { id: userA.user.id } });
    }
    if (userB?.user?.id) {
      await prisma.auditLog.deleteMany({ where: { actorUserId: userB.user.id } });
      await prisma.invoice.deleteMany({ where: { userId: userB.user.id } });
      await prisma.session.deleteMany({ where: { userId: userB.user.id } });
      await prisma.user.delete({ where: { id: userB.user.id } });
    }
    await prisma.$disconnect();
  }

  // --------------------------------------------------------------------------
  // Summary
  // --------------------------------------------------------------------------
  console.log("===============================================================");
  console.log(" TEST EXECUTION SUMMARY");
  console.log("===============================================================");
  console.log(` Total Assertions: ${passedCount + failedCount}`);
  console.log(` Passed:           ${passedCount}`);
  console.log(` Failed:           ${failedCount}`);
  console.log("===============================================================\n");

  if (failedCount > 0) {
    process.exit(1);
  }
}

runTests().catch(async (err) => {
  console.error("Test execution fatal error:", err);
  await prisma.$disconnect();
  process.exit(1);
});
