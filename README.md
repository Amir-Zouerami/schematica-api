# 🏗️ Schematica Backend API

![Schematica Backend Cover](https://github.com/user-attachments/assets/e73d72fd-3d32-4300-b8c7-b023c3e687ec)

[![CI](https://github.com/amir-zouerami/schematica-api/actions/workflows/ci.yml/badge.svg?branch=main&style=for-the-badge)](https://github.com/amir-zouerami/schematica-api/actions/workflows/ci.yml)
[![NestJS](https://img.shields.io/badge/NestJS-11-E0234E?style=for-the-badge&logo=nestjs&logoColor=white)](https://nestjs.com/)
[![Runtime](https://img.shields.io/badge/Runtime-Bun_v1.1-black?style=for-the-badge&logo=bun&logoColor=white)](https://bun.sh/)
[![Prisma](https://img.shields.io/badge/Prisma-v6-2D3748?style=for-the-badge&logo=prisma&logoColor=white)](https://www.prisma.io/)
[![License](https://img.shields.io/badge/License-GPLv3-blue.svg?style=for-the-badge)](https://www.gnu.org/licenses/gpl-3.0)

> **The high-performance, event-driven engine powering the Schematica platform.**

**Schematica** is a collaborative API design and documentation workspace. This repository contains the **Backend API**, engineered to provide a robust, scalable foundation for managing OpenAPI specifications, handling real-time concurrency, and enforcing granular access control.

It is built as a showcase of modern backend engineering principles, prioritizing **Type Safety**, **Clean Architecture**, and **Developer Experience**.

> **Note:** This repository works in tandem with the [Schematica Frontend](https://github.com/Amir-Zouerami/schematica-frontend).
> This project was originally built as an internal tool to solve specific workflow friction points at my previous company. It is now provided as "source-available" for educational purposes.

---

## 🏗️ Architectural Overview

The Schematica API avoids the "Spaghetti Monolith" trap by adopting a **Modular, Event-Driven Architecture**.

### 1. Domain-Driven Modules
The application structure mirrors the business domain. Code is organized into cohesive modules (`ProjectsModule`, `LockingModule`) rather than technical layers. This ensures that related logic sits together, making the codebase intuitive to navigate and easy to scale.

### 2. Decoupled Event-Driven Core
A core principle of this system is the strict separation of **Primary Business Logic** from **Side Effects**. We utilize `@nestjs/event-emitter` to achieve this decoupling.

*   **The Problem:** In many apps, a `createProject` service method grows to 100 lines because it has to send emails, write audit logs, and notify Slack.
*   **Our Solution:** The `ProjectsService` performs **only** the database transaction and emits a typed event (`PROJECT_CREATED`).
*   **The Benefit:** Independent Listeners handle the side effects. If the Notification Service fails, the Audit Log is still written, and the User's request still succeeds. This results in a highly resilient system.

### 3. Hybrid Access Control (RBAC + ABAC)
Security is implemented in two layers for defense-in-depth:
1.  **Coarse-Grained (`RolesGuard`):** Protects entire routes based on a user's system-wide role (e.g., only an `admin` can access `/admin/*`).
2.  **Fine-Grained (`AccessControlService`):** Implements Attribute-Based Access Control (ABAC). It evaluates complex conditions at runtime—checking Project Ownership, Team Membership, and Deny Lists—to authorize specific resources.

### 4. High-Performance State Management
For features requiring high-frequency updates (like **Collaborative Editing Locks**), we bypass the database entirely. The `LockingService` manages ephemeral state using in-memory structures, ensuring the real-time experience remains distinct from persistent storage latency.u

---

## ✨ Key Features

### 🔐 Security & Access Control
*   **Hybrid Auth:** Supports both **Local Strategy** (Bcrypt hashing) and **OAuth2** (GitLab) via Passport.js.
*   **Secure Sessions:** Uses `fastify-secure-session` with `@fastify/cookie` for robust session management.
*   **ABAC (Attribute-Based Access Control):** Beyond simple Roles (`admin` vs `user`), we implement fine-grained guards (`ProjectOwnerGuard`, `ProjectViewerGuard`) that evaluate ownership and team membership at runtime.
*   **Environment Vault:** Project secrets (API Keys, Tokens) are encrypted at rest using `AES-256-GCM` before entering the database.

### ⚡ Real-Time Collaboration
*   **Pessimistic Locking:** Prevents "last-write-wins" race conditions. When a user edits an endpoint, a WebSocket event locks that resource globally. Other users see the lock status update instantly via `Socket.IO`.
*   **Live Notifications:** mentions (`@username`) in notes trigger instant alerts to connected clients.

### 🛠️ API Governance Engine
*   **Spectral Linting:** Integrated `@stoplight/spectral` engine to lint OpenAPI specs against a custom ruleset (`.spectral.yaml`) on every save or import.
*   **Spec Reconciliation:** A smart diffing engine that compares an imported OpenAPI JSON against the database state, determining exactly which endpoints to Create, Update, or Delete (Soft Sync).

### 🚀 Dynamic Mock Server
*   **Zero-Config Mocking:** The API can instantly generate mock responses for *any* endpoint defined in a project.
*   **Faker Integration:** Leverages `json-schema-faker` and `@faker-js/faker` to generate realistic, schema-compliant data (names, emails, UUIDs) based on the OpenAPI schema definition.
*   **Locale & State Support:** Clients can request specific HTTP status codes (e.g., test a `404`) or locales (e.g., `fa`, `en`) via headers.

---

## 📚 API Collection

For a quick start, import the official Postman Collection. It includes environment variables and pre-configured requests for Auth, Projects, and Mocking.

<a href="https://raw.githubusercontent.com/Amir-Zouerami/schematica-api/refs/heads/main/docs/postman/Schematica%20v2.postman_collection.json" target="_blank"><img src="https://run.pstmn.io/button.svg" alt="Run In Postman" style="width: 128px; height: 32px;"></a>


---

## 🛠 Tech Stack

We chose a stack that balances developer ergonomics with raw performance.

| Category          | Technology            | Reasoning                                                                                                                 |
| :---------------- | :-------------------- | :------------------------------------------------------------------------------------------------------------------------ |
| **Runtime**       | **Bun**               | Chosen for its ultra-fast startup time (critical for dev loops) and native TypeScript support.                            |
| **Framework**     | **NestJS**            | Provides the modular structure and dependency injection container needed for enterprise-grade apps.                       |
| **HTTP Adapter**  | **Fastify**           | Replaces Express.js to maximize throughput and minimize overhead.                                                         |
| **Database**      | **SQLite** (Dev)      | Keeping the DB portable allows for zero-setup ease of use. Can be swapped for PostgreSQL in production via Prisma.        |
| **ORM**           | **Prisma**            | Best-in-class type safety. The generated client ensures DB queries align perfectly with TypeScript interfaces.            |
| **Real-time**     | **Socket.IO**         | Manages WebSocket namespaces and rooms for granular update broadcasting.                                                  |
| **Documentation** | **Swagger / OpenAPI** | The API is self-documenting. We use `class-validator` decorators to drive both runtime validation and Swagger generation. |
| **Linting**       | **Spectral**          | An open-source JSON/YAML linter used to govern API design quality programmatically.                                       |

---

## 📂 Project Structure

The directory structure follows **Domain-Driven Design (DDD)** principles. We avoid grouping files by type (controllers/services) and instead group them by **Module/Domain**.

```text
src/
├── access-control/      # 🛡️ ABAC Logic (Permissions service)
├── api-linting/         # 📏 Spectral wrapper service for OAS validation
├── audit/               # 📋 Event listeners for Audit Logging
├── auth/                # 🔐 Passport Strategies (JWT, Local, GitLab)
├── changelog/           # 📜 Event listeners for Changelog generation
├── common/              # 🧱 Shared Kernel (Guards, Interceptors, Filters, Utils)
├── config/              # ⚙️ Type-safe configuration namespace
├── encryption/          # 🔐 AES-256-GCM encryption service for Secrets
├── locking/             # 🚦 In-Memory resource locking (Services + Gateway)
├── mock-server/         # 🎭 Dynamic Mocking Engine (Faker + JSON Schema)
├── notifications/       # 🔔 Notification distribution logic
├── projects/            # 📦 Core Domain: Projects (Aggregates Endpoints, Envs)
│   ├── endpoints/       #    - Sub-domain: API Endpoints
│   ├── environments/    #    - Sub-domain: Env Variables
│   ├── spec-builder/    #    - Logic to assemble DB records into OpenAPI JSON
│   └── spec-reconcile/  #    - Logic to diff JSON against DB records
└── main.ts              # 🚀 Application Bootstrap
```

---

## 🏗️ Architectural Deep Dives

### 1. Hybrid Access Control (RBAC + ABAC)
Security is implemented in layers for defense-in-depth:

1.  **Route Level (RBAC):** The `RolesGuard` protects entire controllers based on system roles.
    ```typescript
    @Roles(Role.admin) // Only Admins can touch this
    @Controller('admin/users')
    ```
2.  **Resource Level (ABAC):** The `AccessControlService` performs logic-heavy checks. It inspects the `Project`, the `User`, and their `TeamMembership` to determine access (Owner vs. Viewer).
    ```typescript
    // Inside ProjectOwnerGuard
    const canOwn = await this.accessControlService.canOwnProject(user, projectId);
    ```

### 2. The "Side-Effect" Architecture
To keep business logic clean, we strictly separate **Actions** from **Reactions** using `EventEmitter2`.

*   **Scenario:** A user updates an endpoint's status.
*   **Service Layer:** Updates the database record. Emits `EndpointEvent.STATUS_UPDATED`. Returns the result.
*   **Audit Listener:** Catches event -> Writes to `AuditLog` table.
*   **Changelog Listener:** Catches event -> Formats a human-readable message ("User X changed status to Published") -> Writes to `Changelog` table.
*   **Notification Listener:** Catches event -> Checks for watchers -> Dispatches WebSocket message.

**Benefit:** If the Audit Logger fails, the User's request still succeeds. The system is loosely coupled and highly resilient.

### 3. Monolithic Deployment Strategy (The `public/` folder)
While the Frontend and Backend are developed in separate repositories for clear separation of concerns, they are designed to be deployed as a **Single Unit**.

The `AppModule` is configured to serve static assets from the `public/` directory (excluding the `/api` prefix).

*   **Workflow:**
    1.  Build the [Schematica Frontend](https://github.com/Amir-Zouerami/schematica-frontend).
    2.  Place the resulting `dist/` files into `schematica-api/public/`.
    3.  Start the NestJS server.
*   **Result:** The NestJS app serves the API on `/api/v2/...` and the React SPA on `/`.
*   **Why?** This eliminates CORS issues in production, simplifies deployment (one container to manage), and allows cookies to be shared securely between the API and the UI.

### 4. Smart Spec Reconciliation
Importing an OpenAPI file isn't just a database overwrite. The `SpecReconciliationService` acts as a specialized "Diff Engine":

1.  **Normalize:** It flattens the incoming JSON spec into a map of `method:path` keys.
2.  **Compare:** It fetches existing endpoints from the DB.
3.  **Decision Matrix:**
    *   *Match:* Compare signatures. If different, mark for **Update**.
    *   *New:* Mark for **Create**.
    *   *Missing:* Mark for **Delete**.
4.  **Execute:** Runs the calculated changes inside a single Prisma Transaction to ensure atomicity.

---

## 🚀 Getting Started

Follow these steps to get the Schematica platform running locally.

### Prerequisites
*   **[Bun](https://bun.sh/)** (v1.1+) - The runtime and package manager.
*   **Git** - Version control.
*   *(Optional)* **Docker** - If you prefer running a PostgreSQL instance instead of the default SQLite dev database.

### 1. Installation

```bash
# Clone the repository
git clone https://github.com/Amir-Zouerami/schematica-api.git
cd schematica-api

# Install dependencies using Bun
bun install
```

### 2. Environment Configuration

Copy the example configuration file. The default settings are tuned for local development.

```bash
cp .env.example .env
```

> **🔑 Critical Security Note:**
> The `.env` file contains the `ENCRYPTION_KEY`. This key is used to encrypt/decrypt sensitive Environment Secrets (API Keys) in the database. If you change this key, all previously encrypted secrets in the DB will become unreadable.

### 3. Database Setup & Seeding

We use **Prisma** to manage the schema and seeding. The seed script is comprehensive—it doesn't just add users; it constructs an entire mock ecosystem (Projects, Teams, Endpoints, and encrypted Secrets).

```bash
# Run migrations and seed the database
bun run migrate:reset
```

**What gets seeded?**
*   **Users:** `amir.zouerami` (Admin), `brooklyn.lee` (Member), `guest.user` (Guest).
*   **Password:** `password123` (for all seeded users).
*   **Projects:**
    *   *Project Nova:* A full public-facing API spec.
    *   *Project Apollo:* An internal microservice spec.
*   **Teams:** Engineering hierarchy (Backend, Frontend, Leadership).

### 4. Running the Server

```bash
# Start in development mode (Hot Reload)
bun run start:dev

# Start in production mode
bun run start:prod
```

The API will be available at `http://localhost:3000/api/v2`.
The Swagger documentation is at `http://localhost:3000/docs`.

---

## 🖥️ Frontend Integration (The "Public" Folder)

To experience the full platform, you need to serve the UI. This backend is configured to serve the Single Page Application (SPA) static files from the `/public` directory.

1.  Clone and build the [Schematica Frontend](https://github.com/Amir-Zouerami/schematica-frontend).
    ```bash
    git clone https://github.com/Amir-Zouerami/schematica-frontend.git
    cd schematica-frontend
    bun install
    bun run build
    ```
2.  Copy the contents of the frontend `dist/` folder into the backend `public/` folder.
    ```bash
    # From the frontend directory
    cp -r dist/* ../schematica-api/public/
    ```
3.  Restart the NestJS server. Access the app at `http://localhost:3000`.

*Note: The API routes are prefixed with `/api/v2`, so they do not conflict with the frontend routing.*

---

## 🤝 Contribution Policy

**This project is provided as "Source-Available" software.**

It serves three primary purposes:
1.  **A Portfolio Piece:** Demonstrating high-level architectural decisions, strict typing, and modern backend patterns.
2.  **Helping The Community:** It gives back to the community i hold so dearly, the open-source community. If you need such a platform for you company, feel free to use it.
3.  **A Reference Implementation:** Helping other developers learn how to build robust, event-driven systems with NestJS and Prisma.

**⚠️ I am NOT accepting Pull Requests.**

This was originally an internal tool built for a specific company context and it's being actively used to this day. While I have open-sourced the code for educational purposes, I am not maintaining it as a community-driven project.

**You are highly encouraged to:**
*   🔱 **Fork** the repository.
*   🔧 **Modify** it to fit your own needs.
*   💡 **Use** the patterns found here in your own projects.

---

## 📄 License

This project is licensed under the **GNU General Public License v3.0**.

<br />

<div align="center">
  <sub>Built with 💙, strictly typed, and engineered to last.</sub>
</div>