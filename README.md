# InvoiceVault

InvoiceVault is a secure invoice-record management application built with Next.js, React, Prisma, and SQLite.

The project demonstrates authenticated record creation, listing, detail viewing, deletion, ownership-scoped database queries, audit logging, and database query optimisation.

## Documentation

See [DOCUMENTATION.md](./DOCUMENTATION.md) for the system architecture, setup instructions, data model, security decisions, testing, evidence, and known limitations.

## Prerequisites

- Node.js and npm
- A local SQLite database configured through `DATABASE_URL`

## Getting Started

1. Install dependencies:

   ```bash
   npm install
   ```

2. Create a local `.env` file using the configuration in `.env.example`.

3. Generate the Prisma client:

   ```bash
   npm run db:generate
   ```

4. Apply the Prisma schema to the local database:

   ```bash
   npm run db:push
   ```

5. Start the development server:

   ```bash
   npm run dev
   ```

6. Open http://localhost:3000.

## Security Principles

- Authenticate requests using the application's server-side session validation.
- Scope invoice reads and mutations to the authenticated owner.
- Use public opaque identifiers in invoice URLs.
- Record deletion events in a durable audit log.
- Verify access control and HTTP status codes with repeatable tests.

## Project Status

This repository is being developed as a software engineering assessment. Features and evidence should be verified against the implementation before being described as complete.
