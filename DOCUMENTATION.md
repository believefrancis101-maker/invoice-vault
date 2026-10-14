# InvoiceVault — Records and Access Slice Documentation

---

## 1. What This Is

InvoiceVault is a secure, multi-tenant invoice record management application built on Next.js 16 (App Router with Turbopack), Prisma ORM, SQLite, and Tailwind CSS. This milestone implements **Assessment 4: The Records and Access Slice**, providing an authenticated, owner-isolated experience for managing commercial invoices and tracking sensitive lifecycle actions.

Authenticated users can:
- View an owner-scoped list of all their invoices, with summary financial metrics and a genuine empty state when no records exist.
- Create new invoice records with strict server-side validation and live Nigerian Naira (₦) currency formatting.
- Inspect an individual invoice through an addressable detail page that references only an opaque `publicId`.
- Permanently delete an invoice via an atomic database transaction that generates an immutable deletion audit record.
- Review personal audit history in a dedicated Activity Log view.

### Security Invariants & Ownership Architecture

1. **Database Query-Level Ownership Enforcement**: Every database query that fetches or modifies an invoice explicitly scopes the operation to the authenticated user's ID (`userId: user.id`). Application code never retrieves a record blindly and relies on subsequent authorization checks.
2. **Anti-Enumeration Protection (HTTP 404 over 403)**: When a user requests an invoice that does not exist or belongs to another tenant, the server responds with a uniform HTTP `404 Not Found`. This prevents attackers from discovering valid public IDs through status code divergence.
3. **Public Identifier Decoupling**: Internal database primary keys (`id: cuid`) are never exposed in user-facing URLs, forms, or JSON API payloads. All external references strictly use an opaque `publicId` (UUID v4).
4. **Audit Durability**: The `AuditLog` model maintains no cascading foreign key to the `Invoice` model. Deletion operations occur inside a database transaction (`prisma.$transaction`) where the audit entry is created before the invoice row is removed, guaranteeing audit record survival.

### Explicit Scope Boundaries

To maintain focus on the records and access slice, the following features are deliberately excluded: invoice editing, text search, tagging, PDF generation, collaborative sharing, external client portals, dashboard widgets, and marketing landing pages.

---

## 2. How To Run It

**Prerequisites:** Node.js >= 20 (tested with Node v24.16.0), npm >= 9.

### 1. Installation & Environment

Clone the repository and install dependencies:
```bash
npm install
```

Configure local environment variables:
```bash
cp .env.example .env
```
Ensure `.env` contains:
```env
DATABASE_URL="file:./dev.db"
AUTH_SECRET="replace-me-with-a-real-random-secret-min-32-chars"
```

### 2. Database Synchronization & Client Generation

Synchronize the database schema and generate the Prisma Client:
```bash
npm run db:push
npm run db:generate
```

### 3. Run Verification & Quality Checks

Run the complete test suite, type checker, linter, and query measurement scripts:
```bash
# Execute automated access-control and SSR page rendering tests (38+ assertions)
npm test

# Run TypeScript type checking
npm run typecheck

# Run ESLint check
npm run lint

# Run database query count and index instrumentation
npm run measure:queries

# Build Next.js application for production
npm run build
```

### 4. Start the Application

```bash
# Start local development server on http://localhost:3000
npm run dev

# Or start the production server
npm run start
```

---

## 3. The Flow, Step By Step

### Invoice Creation

1. **Navigation**: An authenticated user clicks "Create Invoice" on `/dashboard` or navigates directly to `/invoices/new`.
2. **Form Interaction**: The user enters the invoice number (e.g., `INV-2026-001`), client name, amount in Naira, issue date, status (`DRAFT`, `PENDING`, `PAID`, `OVERDUE`, `CANCELLED`), and an optional description.
3. **Live Conversion**: As the user types the Naira amount, the client dynamically computes and previews the exact kobo value (`₦7,500.00` = `750,000 kobo`).
4. **Validation & Submission**: The form validates client-side using `createInvoiceFormSchema` (`src/lib/validation/invoice.ts`). Upon submission, a `POST` request is dispatched to `/api/invoices`.
5. **Server Processing**:
   - The handler derives `userId` exclusively from the verified session cookie via `getCurrentUser()`.
   - The body is validated against `createInvoiceSchema`.
   - The record is persisted to SQLite with `amountKobo` stored as a positive integer.
   - If an invoice number collision occurs for the same user, the database catches the `P2002` error on `@@unique([userId, invoiceNumber])` and returns HTTP `409 Conflict`.
   - On success, the API returns HTTP `201 Created` containing the invoice's public fields (stripping `id`). The browser redirects to `/invoices/[publicId]`.

---

### Invoice Listing & Empty State

1. **Navigation**: Navigating to `/dashboard` or `/invoices` triggers the server component in `src/app/dashboard/page.tsx`.
2. **Scoped Query**: The page executes `prisma.invoice.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" } })`.
3. **Empty State Experience**: If the user has zero invoices, a genuine empty state card renders with an icon, descriptive text, and a prominent "+ Create Invoice" call-to-action. No fake, mock, or seeded data is ever shown.
4. **Summary & Data Table**: If invoices exist, summary cards display Total Invoices, Total Invoiced Value (formatted in `₦`), and Paid count. The table displays invoice numbers, client names, issue dates, status badges, and formatted Naira values.

---

### Invoice Detail Inspection

1. **Navigation**: Clicking an invoice row opens `/invoices/[publicId]`.
2. **Server-Side Authorization**: The server component executes:
   ```typescript
   const invoice = await prisma.invoice.findFirst({
     where: { publicId, userId: user.id },
     select: { publicId: true, invoiceNumber: true, clientName: true, ... }
   });
   ```
3. **404 Guard**: If `invoice` is `null` (because the `publicId` does not exist OR belongs to another tenant), Next.js immediately invokes `notFound()`, rendering the custom 404 screen.
4. **View Presentation**: The detail card presents full commercial details, client information, formatted timestamps, the public identifier, and a "Delete Invoice" trigger.

---

### Atomic Deletion with Audit Logging

1. **Confirmation Prompt**: Clicking "Delete Invoice" opens an accessible confirmation modal warning the user that deletion is irreversible and will be logged in their audit trail.
2. **Execution**: Confirming triggers `DELETE /api/invoices/[publicId]`.
3. **Transactional Boundary**: The API route initiates `prisma.$transaction`:
   - Queries `findFirst` matching `{ publicId, userId: user.id }`. If null, aborts with HTTP `404`.
   - Creates an `AuditLog` row capturing `actorUserId`, `action: "INVOICE_DELETED"`, `entityType: "INVOICE"`, `entityPublicId`, `entityLabel`, and snapshot metadata (client name, amount in kobo, status).
   - Deletes the invoice row: `tx.invoice.delete({ where: { id: invoice.id } })`.
   - If any error occurs during the audit write, the transaction rolls back, preventing an unaudited deletion.
4. **Replay Protection**: If the delete request is replayed, the initial `findFirst` finds nothing and returns HTTP `404`, creating no additional audit records and deleting no records.
5. **Post-Delete Redirect**: The client redirects to `/dashboard` with an updated invoice list.

---

### Activity Log Retrieval

1. **Navigation**: Navigating to `/activity` opens the owner's audit log.
2. **Scoped Retrieval**: The server executes `prisma.auditLog.findMany({ where: { actorUserId: user.id }, orderBy: { createdAt: "desc" } })`.
3. **Presentation**: Renders an immutable timeline showing the event action, entity label, timestamp, public ID, and deleted invoice metadata. Users cannot inspect audit records belonging to other accounts.

---

## 4. The Data Model

The schema is defined in `prisma/schema.prisma` and backed by SQLite (`prisma/dev.db`).

```
┌──────────────┐       1:N       ┌──────────────┐
│    User      ├────────────────►│   Session    │
└──────┬───────┘                 └──────────────┘
       │
       │ 1:N                     ┌──────────────┐
       ├────────────────────────►│VerificationCode
       │                         └──────────────┘
       │ 1:N                     ┌──────────────┐
       ├────────────────────────►│PasswordReset │
       │                         └──────────────┘
       │ 1:N                     ┌──────────────┐
       ├────────────────────────►│   Invoice    │
       │                         └──────────────┘
       │ 1:N                     ┌──────────────┐
       └────────────────────────►│   AuditLog   │
                                 └──────────────┘
```

---

### `invoices`

Holds invoice records created by authenticated users.

| Column | Type | Nullable | Description / Constraints |
|---|---|---|---|
| `id` | String (cuid) | No | Primary key. Internal database identifier, never exposed to clients. |
| `publicId` | String (uuid) | No | `@unique @default(uuid())`. Public external identifier used in URLs. |
| `invoiceNumber` | String | No | Business identifier (e.g., `INV-2026-001`). Trimmed string. |
| `clientName` | String | No | Name of client / organization billed. |
| `description` | String | **Yes** | Optional notes or line-item summary. |
| `amountKobo` | Int | No | Whole integer number of kobo (100 kobo = ₦1.00). Must be positive. |
| `issueDate` | DateTime | No | Date invoice was issued. |
| `status` | String | No | Defaults to `"DRAFT"`. Enum: `DRAFT`, `PENDING`, `PAID`, `OVERDUE`, `CANCELLED`. |
| `createdAt` | DateTime | No | Record creation timestamp. |
| `updatedAt` | DateTime | No | Record modification timestamp (`@updatedAt`). |
| `userId` | String | No | Foreign key referencing `users.id` with `onDelete: Cascade`. |

**Indexes & Constraints**:
- `@@unique([userId, invoiceNumber])`: Guarantees an invoice number is unique within an owner's account, preventing duplicate invoicing while allowing different users to reuse standard numbering schemes.
- `@@index([userId, createdAt])`: Optimizes owner-scoped invoice listings sorted chronologically.
- `@@index([userId, status, createdAt])`: Optimizes filtered dashboard queries by invoice state.

---

### `audit_logs`

Stores immutable security and lifecycle audit events.

| Column | Type | Nullable | Description / Constraints |
|---|---|---|---|
| `id` | String (cuid) | No | Primary key. Internal database identifier. |
| `actorUserId` | String | No | Foreign key referencing `users.id` with `onDelete: Restrict`. |
| `action` | String | No | Action identifier (e.g., `INVOICE_DELETED`). |
| `entityType` | String | No | Type of entity modified (e.g., `INVOICE`). |
| `entityPublicId` | String | No | Opaque public identifier of the affected entity. |
| `entityLabel` | String | No | Human-readable identifier at the time of action (e.g., `INV-2026-001`). |
| `details` | String | **Yes** | Serialized JSON containing non-sensitive snapshot fields. |
| `createdAt` | DateTime | No | Immutable timestamp of the audit event. |

**Audit Survival Architecture**:
`AuditLog` maintains **no foreign key relation** to `Invoice`. The relationship to the deleting user is configured with `onDelete: Restrict`, ensuring the audit trail persists even when the underlying invoice record is permanently deleted.

---

### `users`

Represents user identities.

| Column | Type | Nullable | Constraints |
|---|---|---|---|
| `id` | String (cuid) | No | Primary key. Application-generated cuid. |
| `email` | String | No | `@unique`. Lowercased email address. |
| `name` | String | **Yes** | Display name. |
| `passwordHash` | String | No | bcrypt adaptive hash (cost factor 12). |
| `emailVerified` | Boolean | No | Defaults to `false`. Gates authentication. |
| `createdAt` / `updatedAt` | DateTime | No | Immutable and auto-updated audit timestamps. |

---

### `sessions`

Stores active session tokens.

| Column | Type | Nullable | Constraints |
|---|---|---|---|
| `id` | String (cuid) | No | Primary key. |
| `sessionToken` | String | No | `@unique` SHA-256 hash of the client cookie token. |
| `userId` | String | No | FK to `users.id` with `onDelete: Cascade`. |
| `expiresAt` | DateTime | No | 30-day absolute expiration timestamp. |

---

## 5. The Concepts

### 1. Database Query-Level Ownership Enforcement

**What it is.** All data retrieval and mutation operations include the authenticated tenant's ID directly in the SQL `WHERE` clause:
```typescript
// Correct: Database-enforced isolation
const invoice = await prisma.invoice.findFirst({
  where: { publicId, userId: user.id }
});
```

**Why it matters.** Fetching an invoice by ID alone and subsequently verifying `invoice.userId === user.id` in application code introduces critical security vulnerabilities:
- An engineering mistake or forgotten `if` check exposes cross-tenant records.
- Object caching layers or middleware may accidentally cache unauthorized payloads.
- An attacker can exploit memory or serialization timing differences to confirm record existence.
By enforcing `userId` in the SQL predicate, the database engine guarantees that unauthorized records are never loaded into process memory.

---

### 2. Opaque Public Identifiers (`publicId`)

**What it is.** Separating internal database primary keys (`id: cuid`) from external identifiers (`publicId: uuid`).

**Why it matters.** Exposing database keys in URLs or responses introduces severe risks:
- Sequential integers allow trivial enumeration attacks (`/invoices/1`, `/invoices/2`).
- Cuids contain timestamp and counter components that leak record creation velocity and server time.
- Exposing internal keys couples external integrations to database schema migrations.
In InvoiceVault, clients interact only with UUID v4 strings, keeping database internals completely opaque.

---

### 3. Deletion Audit Trail & Survival

**What it is.** An immutable record created before or during record deletion that outlives the record itself.

**How it is implemented.**
```typescript
const result = await prisma.$transaction(async (tx) => {
  const invoice = await tx.invoice.findFirst({
    where: { publicId, userId: user.id }
  });
  if (!invoice) return null;

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

  await tx.invoice.delete({ where: { id: invoice.id } });
  return invoice;
});
```

**Why it matters.** In financial and billing software, deleting records without an audit trail creates regulatory non-compliance, fraud vectors, and tracking failure. Placing both operations inside `prisma.$transaction` ensures that an invoice cannot be deleted if the audit write fails.

---

### 4. Query Counts and Database Indexes: Methodology and Empirical Evidence

**Measurement Methodology.**
To obtain actual observed measurements (not theoretical claims), we implemented `scripts/measure-queries.mjs` using Prisma's event-based query logging:
```typescript
const prisma = new PrismaClient({
  log: [{ emit: "event", level: "query" }]
});
prisma.$on("query", (e) => queryLog.push(e));
```
We also inspected SQLite's physical query plans via `EXPLAIN QUERY PLAN` for each operation.

#### Empirical Results (Measured Targets: Listing, Creation, Detail Lookup)

| Action | Primary Target | Statement Count | Observed Latency | Statement Classifications | SQLite Index Plan |
|---|---|---|---|---|---|
| **1. Invoice Listing** | Target 1 | **1 statement** | 1.59 ms | 1x READ (`SELECT` with `ORDER BY`) | `SEARCH invoices USING INDEX invoices_userId_createdAt_idx (userId=?)` |
| **2. Invoice Creation** | Target 2 | **1 statement** | 6.43 ms | 1x WRITE (`INSERT` with `RETURNING`) | Table insert + unique constraint evaluation |
| **3. Invoice Detail Lookup** | Target 3 | **1 statement** | 1.12 ms | 1x READ (`SELECT` with `LIMIT 1`) | `SEARCH invoices USING INDEX invoices_publicId_key (publicId=?)` |
| **4. Atomic Deletion** | Supplemental | **5 statements** | 11.28 ms | 2x TX (`BEGIN`/`COMMIT`), 1x READ (`SELECT`), 1x WRITE (`INSERT audit_logs`), 1x WRITE (`DELETE invoices`) | Ownership seek + primary key delete |

#### Honest Baseline & Query Count vs. Latency Distinction

> [!IMPORTANT]
> **Honest Baseline & Query Count Analysis:**
> - **Historical Baseline Limitations**: In the Git repository history, commit `5c1952a` integrated the authentication slice directly with the initial schema definition. No earlier working invoice CRUD implementation exists in Git history from which to draw genuine "pre-optimization" historical telemetry. We do not invent historical figures or present synthetic estimates as observed results.
> - **Statement Count Optimization**: From the first working implementation, Prisma executes exactly **1 SQL statement** for listing, **1 statement** for creation, and **1 statement** for detail lookup. A relational database cannot execute a `SELECT` or `INSERT` in fewer than 1 statement without caching. Thus, statement counts were already minimal at baseline.
> - **Index Execution Plan Impact**: The optimization delivered is qualitative **index coverage and execution plan efficiency**, not statement count reduction:
>   - Without `@@index([userId, createdAt])`, SQLite must perform an unindexed full-table scan (`SCAN invoices`) with an in-memory sort ($O(N \log N)$).
>   - With `@@index([userId, createdAt])`, SQLite performs an index range seek (`SEARCH invoices USING INDEX ...`) and reads already-ordered rows ($O(\log N)$).
>   - For detail lookup, the unique index on `publicId` (`invoices_publicId_key`) enables an $O(1)$ B-tree seek rather than a sequential table scan.

---

### 5. Financial Representation: Integer Kobo Storage

**What it is.** Storing currency amounts as integer multiples of the smallest currency unit (kobo) rather than floating-point Naira.

**Why it matters.** Binary floating-point arithmetic cannot represent base-10 fractions accurately:
```javascript
0.1 + 0.2 === 0.30000000000000004 // true in JavaScript IEEE 754
```
Over thousands of transactions, floating-point rounding errors accumulate into significant balance discrepancies. In InvoiceVault:
- ₦1,250.50 is stored as integer `125050`.
- Amounts are converted to Naira only during UI rendering (`formatNaira(amountKobo)`).

---

## 6. What Went Wrong

### Problem 1 — Windows File Lock on Native Prisma DLL (`EPERM`)

- **Symptom**: Running `npm run db:generate` or `npm run db:push` failed with:
  `EPERM: operation not permitted, rename '...query_engine-windows.dll.node.tmp' -> '...query_engine-windows.dll.node'`
- **Investigation**: Inspected running processes. The Next.js dev server was active and running on Windows. Windows locks loaded dynamic libraries (.node/.dll) in memory while the process is alive.
- **Root Cause**: The Prisma CLI attempts to overwrite the query engine binary in `node_modules/.prisma/client`, which Windows blocks while any Node process has that DLL open.
- **Fix**: Generated the client before starting background processes, or passed `--skip-generate` to `prisma db push` during live development.

---

### Problem 2 — Zod v4 Breaking Schema Syntax

- **Symptom**: During initial TypeScript compilation, `src/lib/validation/invoice.ts` threw:
  `error TS2353: Object literal may only specify known properties, and 'required_error' does not exist in type '$ZodNumberParams'.`
- **Investigation**: Examined `package.json` dependencies. The project specifies `zod: ^4.6.4` (Zod v4). Zod v4 deprecates v3-style options like `required_error`, `invalid_type_error`, and `errorMap`.
- **Root Cause**: Schema parameters followed Zod v3 conventions in a Zod v4 environment.
- **Fix**: Refactored schemas to Zod v4 parameter signatures using `{ message: "..." }` and `error` parameters, maintaining comprehensive validation while passing TypeScript checks cleanly.

---

### Problem 3 — Replay Race Conditions on Invoice Deletion

- **Symptom**: A rapid double-click or automated retry of a delete request risked writing a duplicate audit log entry for an invoice that had already been deleted.
- **Investigation**: Analyzed the deletion handler sequence. If existence verification occurred outside the transaction, two concurrent requests could both observe the invoice before either deleted it.
- **Root Cause**: Non-atomic read-then-write sequence across concurrent requests.
- **Fix**: Wrapped the ownership lookup (`tx.invoice.findFirst`) inside the `prisma.$transaction`. The first request deletes the invoice and commits the audit row; the second request finds `null` and aborts immediately with HTTP 404, generating zero additional audit events.

---

## 7. What This Slice Does Not Handle

### Architectural Limits at Scale

- **SQLite Write Locks**: SQLite locks the database file during writes. Under high concurrent invoice creation or deletion traffic, write requests queue and latency increases. Scaling requires migrating to PostgreSQL (`provider = "postgresql"` in `prisma/schema.prisma`).
- **Synchronous Audit Logging**: Audit records are written synchronously within the client request transaction. Under enterprise audit volumes, this should be offloaded to an asynchronous event bus or outbox pattern (e.g., Kafka / SQS) to maintain sub-5ms HTTP responses.
- **In-Memory Rate Limiting**: The authentication rate limiter uses an in-process `Map` that is not shared across multi-container deployments. Production requires Redis / Upstash.

### Deliberately Out of Scope

- **Invoice Editing**: The brief mandates a minimal records slice without editing or versioning. Invoices are created and deleted; mutable updates were omitted to preserve audit simplicity.
- **Search & Complex Filtering**: Full-text client search, tag filtering, and date range filters were excluded per the specification.
- **Soft Deletes**: The assessment requires genuine record deletion with an surviving audit trail. Soft deletes (e.g., `deletedAt: DateTime?`) were avoided to strictly test cross-entity audit durability.
- **PDF Generation & Email Dispatch**: Invoices exist as database records; PDF export and email delivery were omitted.

---

## 8. If I Built This Again

If I built this again from scratch, I would:

1. **Leverage PostgreSQL Row-Level Security (RLS)**: While application-level query scoping (`where: { userId: user.id }`) is effective, database-native RLS establishes an unbreakable security boundary at the database connection pool level. Even if an engineer wrote `prisma.invoice.findMany()`, the database itself would filter rows by the current tenant ID.
2. **Implement an Event-Driven Audit Outbox**: Rather than executing audit writes in the synchronous HTTP request path, I would write audit events to a transactional outbox table and stream them to an immutable audit store (such as Amazon CloudTrail or a dedicated ClickHouse cluster) for tamper-proof compliance.
3. **Use Nanoid with Custom Prefixes**: While UUID v4 is secure and collision-free, type-prefixed identifiers (e.g., `inv_9b1deb4d...` and `aud_7c2e8a1f...`) significantly improve developer experience and debugging in API logs and network traces.

---

## Access Control Verification Results

The automated test suite (`npm test`) verifies all security invariants across two isolated test tenants (`User A` and `User B`):

```
===============================================================
 INVOICEVAULT: ACCESS CONTROL & AUTHORIZATION TEST SUITE
 Target Server: http://localhost:3000
===============================================================

--- Requirement 4: Unauthenticated Access Guard ---
  [PASS] GET /api/invoices unauthenticated receives 401
  [PASS] POST /api/invoices unauthenticated receives 401
  [PASS] GET /api/invoices/[publicId] unauthenticated receives 401
  [PASS] DELETE /api/invoices/[publicId] unauthenticated receives 401
  [PASS] GET /api/audit-logs unauthenticated receives 401

--- Requirement 7: Input Validation & Malformed Payload Rejection ---
  [PASS] Rejects invalid payload: Empty invoice number
  [PASS] Rejects invalid payload: Missing client name
  [PASS] Rejects invalid payload: Negative amountKobo
  [PASS] Rejects invalid payload: Non-integer kobo amount (fractional)
  [PASS] Rejects invalid payload: Invalid status enum value
  [PASS] Rejects invalid payload: Invalid issue date format

--- Requirement 1: User A Record Lifecycle & Access ---
  [PASS] User A creates invoice with HTTP 201
  [PASS] Created invoice returns opaque publicId
  [PASS] Created invoice has correct invoiceNumber
  [PASS] Internal database ID ('id') is NOT exposed in API response
  [PASS] User A lists invoices with HTTP 200
  [PASS] User A's invoice list contains the newly created invoice
  [PASS] User A views detail with HTTP 200
  [PASS] Detail returns correct invoice by publicId
  [PASS] Detail does NOT expose internal database ID

--- Requirement 2: Cross-Tenant Read Isolation ---
  [PASS] User B accessing User A's invoice receives 404 Not Found (avoids record disclosure)
  [PASS] User B's invoice list does NOT contain User A's invoice

--- Requirement 3: Cross-Tenant Delete Isolation ---
  [PASS] User B attempting to delete User A's invoice receives 404 Not Found
  [PASS] User A's invoice was NOT deleted by User B's unauthorized request
  [PASS] No audit event was recorded for User B's failed deletion attempt

--- Requirement 6: Deletion Audit Trail & Survival ---
  [PASS] User A deletes own invoice with HTTP 200
  [PASS] Invoice is permanently removed from invoices table
  [PASS] Audit record exists in database after invoice deletion
  [PASS] Audit record action is INVOICE_DELETED
  [PASS] Audit record preserves invoice number
  [PASS] Audit record entityType is INVOICE
  [PASS] User A can fetch activity audit logs via API
  [PASS] User A's Activity Log API returns the deletion event
  [PASS] User B's Activity Log does NOT expose User A's audit event

--- Requirement 5: Replayed Delete Protection & Idempotency ---
  [PASS] Replayed delete returns HTTP 404 Not Found
  [PASS] Replayed delete does NOT create duplicate or misleading audit entries

--- Unique Invoice Number per Owner ---
  [PASS] First invoice with number created successfully (201)
  [PASS] Duplicate invoice number for same user returns 409 Conflict

===============================================================
 TEST EXECUTION SUMMARY: 38/38 Passed (0 Failed)
 SSR PAGE NAVIGATION: Verified (/dashboard, /invoices/new, /invoices/[publicId], /activity)
===============================================================
```
