# Schematica API v2

[![CI](https://github.com/amir-zouerami/schematica-api/actions/workflows/ci.yml/badge.svg?branch=main&style=for-the-badge)](https://github.com/amir-zouerami/schematica-api/actions/workflows/ci.yml)
[![License: GPL v3](https://img.shields.io/badge/License-GPLv3-blue.svg?style=for-the-badge)](https://www.gnu.org/licenses/gpl-3.0)

> A modern, collaborative platform for designing, documenting, and governing your APIs with confidence.


## 🚀 Introduction

In a world of distributed systems and microservices, maintaining a consistent, well-documented, and reliable API is harder than ever. Teams struggle with outdated documentation, inconsistent designs, and a lack of a central source of truth, leading to slower development cycles and integration headaches.

Schematica is a backend platform built to solve this problem. It provides a single, collaborative environment where teams can design, document, and govern their APIs throughout their entire lifecycle. Think of it as a version-controlled, real-time workspace for your API specifications, built with the developer experience at its core.

This project is a complete, from-the-ground-up rewrite of an older concept, now built on a modern, scalable, and robust tech stack powered by **NestJS**, **Prisma**, and **PostgreSQL**, designed to showcase best practices in backend engineering.

🚧 **This is a living project and a work in progress.** The core foundation is solid, and exciting new features are being added regularly. See the [Project Roadmap](#project-roadmap) for what's coming next!

## 📚 Table of Contents

## 📚 Table of Contents

- [🚀 Introduction](#-introduction)
- [🧠 Core Philosophy](#-core-philosophy)
- [✨ Key Features (Current)](#-key-features-current)
- [📫 API Collection](#-api-collection)
- [🏗️ Architectural Overview](#-architectural-overview)
- [🛠️ Tech Stack](#-tech-stack)
- [🚀 Getting Started](#-getting-started)
- [🗺️ Project Roadmap](#-project-roadmap)
- [🙌 Contributing](#-contributing)

## 🧠 Core Philosophy

Schematica is more than just a collection of features; it's an opinionated project built on a foundation of modern software engineering principles. The goal is not just to build a tool, but to build it *the right way*. Every decision is deliberate and guided by the following tenets:

*   **🏛️ Architectural Excellence:** We don't just write code that works; we build systems that last. The application follows SOLID principles and Clean Architecture patterns to ensure a clear separation of concerns. Logic is decoupled, modules are cohesive, and the codebase is designed to be easily maintained and extended.

*   **🤝 Developer Experience First:** A great platform starts with a great API. The Schematica API is designed to be predictable, consistent, and self-documenting. With built-in OpenAPI (Swagger) generation, robust validation, and a clear, standardized response structure, interacting with the API is a seamless experience.

*   **⚡ Decoupled & Event-Driven:** Core business logic is intentionally kept separate from side-effects like auditing, changelog generation, and notifications. We leverage an event-driven system (`@nestjs/event-emitter`) to decouple these concerns, resulting in a more resilient, scalable, and testable application. When a project is updated, the `ProjectsService` simply emits an event; it doesn't need to know or care about what happens next.

*   **🛡️ Robustness & Reliability:** This is a production-grade application. We enforce a zero-`any` policy for absolute type safety, handle errors gracefully with a custom exception hierarchy, and ensure every change passes a comprehensive CI pipeline with linting, formatting, and automated tests.


## ✨ Key Features (Current)

The platform already boasts a rich set of features designed for professional development teams.

*   **👥 User & Team Management:** Full administrative CRUD for managing users and organizing them into teams.
*   **📂 Project Workspaces:** Create and manage projects as central workspaces for your API specifications.
*   **📄 OpenAPI Native:** Import and export full OpenAPI 3.0 specifications. The spec is the source of truth for all endpoint documentation.
*   **🔐 Granular Access Control:** A powerful, hybrid security model.
    *   **Role-Based Access:** System-wide roles (`admin`, `member`, `guest`) for broad permissions.
    -   **Attribute-Based Access:** Fine-grained control over who can view or own a project, with support for individual users, teams, and explicit denials.
*   **✍️ Collaborative Endpoint Editing:** Full CRUD for a project's endpoints and their associated documentation.
*   **🔒 Real-time Endpoint Locking:** Prevents concurrent edits by allowing a user to "lock" an endpoint while they are making changes. Other users are notified in real-time.
*   **💬 Notes & Mentions:** Attach notes to any endpoint to facilitate discussions. Mention users with `@username` to send them real-time notifications.
*   **🔔 Live Notification System:** A secure, real-time notification system powered by WebSockets to keep users informed of relevant events.
*   **📋 Comprehensive Audit Trail:** A detailed, event-driven log of all critical actions performed in the system, accessible only to administrators.
*   **📜 Automatic Changelog:** A human-readable changelog is automatically generated for each project, tracking every meaningful change to its endpoints.
*   **🖼️ Secure File Uploads:** Support for multipart file uploads, used for features like user profile pictures, with proper cleanup and storage.


## 📫 API Collection

To get started with the API quickly, you can use the official Postman collection. It includes pre-configured requests for all major endpoints, along with environment variables for easy configuration.

<a href="https://raw.githubusercontent.com/Amir-Zouerami/schematica-api/refs/heads/main/docs/postman/Schematica%20v2.postman_collection.json" target="_blank"><img src="https://run.pstmn.io/button.svg" alt="Run In Postman" style="width: 128px; height: 32px;"></a>


## 🏗️ Architectural Overview

The Schematica API is built using a modern, modular, and scalable architecture designed for high performance and maintainability.

### 1. Modular, Hexagonal Design

The application is organized into **feature modules** (e.g., `ProjectsModule`, `AdminModule`, `LockingModule`), each with a clearly defined responsibility. We adhere to principles of **Clean Architecture**, where core business logic is independent of external concerns like the database or web frameworks. Controllers and gateways act as "ports," and services are the "use cases," ensuring a clean separation of concerns.

#### 2. The Service Layer: Core Business Logic

All business logic resides in the **service layer**. Controllers are kept deliberately thin; their only job is to handle HTTP requests, validate DTOs, and delegate to the appropriate service. Services orchestrate the application's behavior, interact with the Prisma client, and emit events.

#### 3. Event-Driven & Decoupled Systems

A core principle is the decoupling of primary actions from their side effects. Instead of a single service doing too much, it emits a strongly-typed event, and other modules listen for it.

*   **Example Flow:** When an endpoint is updated, the `EndpointsService` simply saves the change and emits an `EndpointEvent.UPDATED` event.
    *   The `ChangelogListener` catches this and creates a human-readable entry.
    *   The `AuditListener` catches it and creates a detailed, machine-readable log.
    *   The `NotificationListener` might catch it to notify subscribed users.

This design makes the system incredibly extensible. Adding a new side-effect (like sending a webhook) is as simple as creating a new listener, with zero changes to the original service.

#### 4. Hybrid Access Control Model

Security is implemented in two layers:
1.  **Coarse-Grained (`RolesGuard`):** Protects entire routes or controllers based on a user's system-wide role (e.g., only an `admin` can access the `/admin/*` routes).
2.  **Fine-Grained (`AccessControlService`):** A dedicated service that handles complex, resource-specific authorization logic (e.g., "Can this specific `user` view this `project`?"). It checks for user access, team memberships, and explicit denials, providing a powerful, attribute-based access control (ABAC) system.

#### 5. Stateful In-Memory Services

For features requiring high-performance, ephemeral state, we use dedicated stateful singletons. The `LockingService` is a prime example. It holds the current state of all resource locks in an in-memory `Map`, providing instantaneous reads and writes without database overhead. A background cleanup job ensures this in-memory state is self-healing and doesn't suffer from memory leaks.

#### 6. Real-time Communication via WebSockets

The platform provides a rich, real-time user experience using secure, namespaced WebSocket gateways. The `NotificationsGateway` and `LockingGateway` authenticate clients via JWT and use a room-based subscription model (`socket.join('resource:123')`) to efficiently broadcast updates only to relevant clients, minimizing network traffic.


## 🛠️ Tech Stack

This project is built with a modern, robust, and scalable technology stack, prioritizing type safety, performance, and developer productivity.

### Backend
*   **Framework:** [NestJS](https://nestjs.com/) (v11) - A progressive Node.js framework for building efficient, reliable, and scalable server-side applications.
*   **Runtime:** [Bun](https://bun.sh/) - A fast, all-in-one JavaScript runtime, bundler, and package manager.
*   **Database ORM:** [Prisma](https://www.prisma.io/) (v5) - A next-generation ORM that makes database access easy with auto-completion and type safety.
*   **Database:** [PostgreSQL](https://www.postgresql.org/) - A powerful, open-source object-relational database system. (Using SQLite for CI/dev environments).
*   **Authentication:** [Passport.js](http://www.passportjs.org/) with JWT for secure, stateless authentication.
*   **Real-time:** [Socket.IO](https://socket.io/) for high-performance, bidirectional WebSocket communication.
*   **API Specification:** [Swagger (OpenAPI)](https://swagger.io/) for automatic API documentation and generation.


#### Tooling & Environment
*   **Language:** [TypeScript](https://www.typescriptlang.org/) (v5) with strict mode enabled.
*   **Linting & Formatting:** ESLint and Prettier for maintaining a consistent and high-quality codebase.
*   **Testing:** [Jest](https://jestjs.io/) for unit and end-to-end testing.
*   **CI/CD:** GitHub Actions for automated linting, testing, and building on every push and pull request.


## 🚀 Getting Started

To get the project up and running on your local machine, follow these steps.


### Prerequisites
- [Bun](https://bun.sh/docs/installation) installed (`curl -fsSL https://bun.sh/install | bash`)
- [Git](https://git-scm.com/)


#### 1. Clone the Repository
```bash
git clone https://github.com/amir-zouerami/schematica-api.git
cd schematica-api
```

#### 2. Install Dependencies
This project uses Bun as its package manager.
```bash
bun install
```

#### 3. Set Up Environment Variables
Copy the example environment file and fill in the required values. For local development, the defaults are often sufficient.
```bash
cp .env.example .env
```
*(You'll need to update `.env` with your database URL, JWT secret, etc.)*

#### 4. Set Up the Database
This command will create the database and run the seed script to populate it with initial data.
```bash
bun run migrate:reset
```

#### 5. Run the Application
```bash
# Development mode with hot-reloading
bun run start:dev
```
The application will be running on `http://localhost:3000`. The automatically generated API documentation can be accessed at `http://localhost:3000/docs`.


## 🗺️ Project Roadmap

The project has an ambitious and exciting future! The core foundation is now stable, and development is focused on adding powerful new features to make Schematica an indispensable tool for API-first development teams.

### ✅ Completed
*   **Epic 1: Foundational UX & Security:** Full admin CRUD, file uploads, role-based access, and core project/endpoint management.
*   **Epic 2: Core Collaboration & Auditing:** Event-driven audit trails, changelogs, real-time notifications with @-mentions, and in-memory endpoint locking.

### 🏗️ Up Next

The following major epics are planned for development.

*   **Epic 3: Endpoint Lifecycle & Approval Workflow**
    - [ ] **Endpoint Status:** Introduce a status lifecycle (`DRAFT`, `IN_REVIEW`, `PUBLISHED`, `DEPRECATED`) to the `Endpoint` model.
    - [ ] **Approval Workflow:** Implement the business logic and API endpoints for a formal review process, allowing project owners to approve or reject proposed changes.

*   **Epic 4: Secure Environment & Secrets Management**
    - [ ] **Environment Model:** Create a system for managing project-specific environments (e.g., `development`, `staging`, `production`).
    - [ ] **Secrets Vault:** Build a secure, encrypted vault for storing environment-specific secrets like API keys and tokens.

*   **Epic 5: Extensible OAuth 2.0 Authentication**
    - [ ] **"Sign in with GitLab":** Implement a flexible Passport.js strategy to allow users to authenticate via their GitLab accounts.
    - [ ] **Just-in-Time Provisioning:** Automatically create a Schematica user account the first time a user signs in via an OAuth provider.

*   **Epic 6: API Governance & Tooling**
    - [ ] **Reusable Schema Registry:** Build a central registry for common OpenAPI schemas (`User`, `Error`, etc.) that can be referenced across multiple endpoints and projects.
    - [ ] **Automated API Linting:** Integrate a linter like Spectral to automatically validate OpenAPI specs against a configurable style guide on import or update.
    - [ ] **Dynamic Mock Server:** Generate a live mock server for any project based on its OpenAPI specification, serving realistic example data for frontend development and testing.

## 🙌 Contributing

Contributions, issues, and feature requests are welcome! Feel free to check the [issues page](https://github.com/amir-zouerami/schematica-api/issues).

We welcome contributions from the community. To contribute:
1.  Fork the Project
2.  Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3.  Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4.  Push to the Branch (`git push origin feature/AmazingFeature`)
5.  Open a Pull Request

Please ensure your code adheres to the existing style and that all CI checks are passing.
