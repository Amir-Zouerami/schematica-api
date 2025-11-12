# Schematica API v2

[![CI](https://github.com/amir-zouerami/schematica-api/actions/workflows/ci.yml/badge.svg?branch=main&style=for-the-badge)](https://github.com/amir-zouerami/schematica-api/actions/workflows/ci.yml)
[![License: GPL v3](https://img.shields.io/badge/License-GPLv3-blue.svg?style=for-the-badge)](https://www.gnu.org/licenses/gpl-3.0)

> A modern, collaborative platform for designing, documenting, and governing your APIs with confidence.

## 🚀 Introduction

In a world of distributed systems, maintaining a consistent, well-documented, and reliable API is harder than ever. Teams struggle with outdated documentation, inconsistent designs, and a lack of a central source of truth, leading to slower development cycles and integration headaches.

Schematica is a backend-first platform, with its source available as a showcase of modern software engineering principles. It provides a single, collaborative environment where teams can design, document, and govern their APIs throughout their entire lifecycle. Think of it as a version-controlled, real-time workspace for your API specifications, built with the developer experience at its core.

Built on a modern, scalable, and robust tech stack powered by **NestJS** and **Prisma**, this project is engineered to meet the demands of professional development teams.

## 📚 Table of Contents

- [🚀 Introduction](#-introduction)
- [🧠 Core Philosophy](#-core-philosophy)
- [✨ Key Features](#-key-features)
- [📫 API Collection](#-api-collection)
- [🏗️ Architectural Overview](#️-architectural-overview)
- [🛠️ Tech Stack](#️-tech-stack)
- [🚀 Getting Started](#-getting-started)
- [🙌 A Note on Contributions](#-a-note-on-contributions)

## 🧠 Core Philosophy

Schematica is more than just a collection of features; it's an opinionated project built on a foundation of modern software engineering principles. The goal is not just to build a tool, but to build it *the right way*. Every decision is deliberate and guided by the following tenets:

*   **🏛️ Architectural Excellence:** We don't just write code that works; we build systems that last. The application follows SOLID principles and Clean Architecture patterns to ensure a clear separation of concerns. Logic is decoupled, modules are cohesive, and the codebase is designed to be easily maintained and extended.

*   **🤝 Developer Experience First:** A great platform starts with a great API. The Schematica API is designed to be predictable, consistent, and self-documenting. With built-in OpenAPI (Swagger) generation, robust validation, and a clear, standardized response structure, interacting with the API is a seamless experience.

*   **⚡ Decoupled & Event-Driven:** Core business logic is intentionally kept separate from side-effects like auditing, changelog generation, and notifications. We leverage an event-driven system (`@nestjs/event-emitter`) to decouple these concerns, resulting in a more resilient, scalable, and testable application. When a project is updated, the `ProjectsService` simply emits an event; it doesn't need to know or care about what happens next.

*   **🛡️ Robustness & Reliability:** This is a production-grade application. We enforce a zero-`any` policy for absolute type safety, handle errors gracefully with a custom exception hierarchy, and ensure every change passes a comprehensive CI pipeline with linting, formatting, and automated tests.

## ✨ Key Features

The platform boasts a rich set of features designed for professional development teams.

*   **👥 User & Team Management:** Full administrative CRUD for managing users and teams, with support for both local and OAuth-based (GitLab) authentication.
*   **📂 Project Workspaces:** Create and manage projects as central workspaces for your API specifications.
*   **📄 OpenAPI Native:** Import and export full OpenAPI 3.0 specifications. The spec is the source of truth for all endpoint documentation.
*   **🔐 Granular Access Control:** A powerful, hybrid security model combining Role-Based (RBAC) and Attribute-Based (ABAC) controls for both system-wide and resource-specific permissions.
*   **✍️ Collaborative Endpoint Editing:** Full CRUD for a project's endpoints with real-time notifications to keep teams in sync.
*   **🔒 Real-time Endpoint Locking:** Prevents concurrent edits by allowing a user to "lock" an endpoint while making changes. Other users are notified in real-time via WebSockets.
*   **💬 Notes & Mentions:** Attach notes to any endpoint to facilitate discussions. Mention users with `@username` to send them real-time notifications.
*   **📋 Comprehensive Audit Trail:** A detailed, event-driven log of all critical actions performed in the system, accessible only to administrators.
*   **📜 Automatic Changelog:** A human-readable changelog is automatically generated for each project, tracking every meaningful change to its endpoints.
*   **🛡️ Secure Environment Vault:** Create project-specific environments (e.g., `development`, `production`) and store sensitive data like API keys and tokens in a securely encrypted vault.
*   **🎨 API Governance Suite:**
    *   **Reusable Schema Registry:** Build a central library of reusable OpenAPI schemas (`User`, `Error`, etc.) within a project to enforce consistency and reduce duplication.
    *   **Automated API Linting:** Automatically enforce API style guides and best practices on import or update using an integrated Spectral linter with a custom ruleset.
*   **🚀 Dynamic Mock Server:** Instantly generate a dynamic mock server from any project's OpenAPI specification. This allows frontend teams to develop against realistic, validated API responses before the backend implementation is complete. Supports status code and locale selection.

## 📫 API Collection

To get started with the API quickly, you can use the official Postman collection. It includes pre-configured requests for all major endpoints, along with environment variables for easy configuration.

<a href="https://raw.githubusercontent.com/Amir-Zouerami/schematica-api/refs/heads/main/docs/postman/Schematica%20v2.postman_collection.json" target="_blank"><img src="https://run.pstmn.io/button.svg" alt="Run In Postman" style="width: 128px; height: 32px;"></a>

## 🏗️ Architectural Overview

The Schematica API is built using a modern, modular, and scalable architecture designed for high performance and maintainability.

#### 1. Modular, Hexagonal Design
The application is organized into **feature modules** (e.g., `ProjectsModule`, `AdminModule`, `LockingModule`), each with a clearly defined responsibility. We adhere to principles of **Clean Architecture**, where core business logic is independent of external concerns like the database or web frameworks. Controllers and gateways act as "ports," and services are the "use cases," ensuring a clean separation of concerns.

#### 2. Decoupling with an Event-Driven Core
A core principle is the decoupling of primary actions from their side effects. Instead of a single service doing too much, it emits a strongly-typed event, and other modules listen for it. This design makes the system incredibly resilient and extensible. Adding a new side-effect (like sending a webhook) is as simple as creating a new listener, with zero changes to the original service.

#### 3. Hybrid Access Control Model
Security is implemented in two layers for defense in depth:
1.  **Coarse-Grained (`RolesGuard`):** Protects entire routes based on a user's system-wide role (e.g., only an `admin` can access `/admin/*`).
2.  **Fine-Grained (`AccessControlService`):** A dedicated service that handles complex, resource-specific authorization (e.g., "Can this `user` view this `project`?"), providing a powerful, attribute-based access control (ABAC) system.

#### 4. High-Performance State with In-Memory Services
For features requiring high-performance, ephemeral state, we use dedicated stateful singletons. The `LockingService` holds the current state of all resource locks in an in-memory `Map`, providing instantaneous reads and writes without database overhead and ensuring a responsive collaborative experience. A background cleanup job ensures this in-memory state is self-healing.

#### 5. Real-Time Collaboration with WebSockets
A rich, real-time user experience is provided using secure, namespaced WebSocket gateways. The `NotificationsGateway` and `LockingGateway` authenticate clients via JWT and use a room-based model (`socket.join('resource:123')`) to efficiently broadcast updates only to relevant clients, minimizing network traffic.

## 🛠️ Tech Stack

This project is built with a modern, robust, and scalable technology stack, prioritizing type safety, performance, and developer productivity.

#### Backend
*   **Framework:** [NestJS](https://nestjs.com/) (v11)
*   **Runtime:** [Bun](https://bun.sh/)
*   **Database ORM:** [Prisma](https://www.prisma.io/) (v5)
*   **Database:** Utilizes **SQLite** for local development and CI for its simplicity and speed. Prisma's abstraction ensures seamless portability to production-grade databases like **PostgreSQL**, **MySQL**, or **CockroachDB**.
*   **Authentication:** [Passport.js](http://www.passportjs.org/) with JWT and OAuth 2.0 (GitLab) strategies.
*   **Real-time:** [Socket.IO](https://socket.io/) for bidirectional WebSocket communication.
*   **API Specification & Governance:** [Swagger (OpenAPI)](https://swagger.io/) and [Spectral](https://stoplight.io/open-source/spectral).

#### Tooling & Environment
*   **Language:** [TypeScript](https://www.typescriptlang.org/) (v5) with strict mode enabled.
*   **Linting & Formatting:** ESLint and Prettier for a consistent, high-quality codebase.
*   **Testing:** [Jest](https://jestjs.io/) for unit and end-to-end testing.
*   **CI/CD:** GitHub Actions for automated linting, testing, and building on every push and pull request.

## 🚀 Getting Started

To get the project up and running on your local machine, follow these steps.

#### Prerequisites
- [Bun](https://bun.sh/docs/installation) installed (`curl -fsSL https://bun.sh/install | bash`)
- [Git](https://git-scm.com/)

#### 1. Clone the Repository
```bash
git clone https://github.com/amir-zouerami/schematica-api.git
cd schematica-api
```

#### 2. Install Dependencies```bash
bun install
```

#### 3. Set Up Environment Variables
Copy the example environment file. The default values are sufficient for local development.
```bash
cp .env.example .env
```
*(For features like GitLab OAuth, you'll need to update `.env` with your own client IDs and secrets.)*

#### 4. Set Up the Database
This command creates the `dev.db` SQLite database and runs the seed script to populate it with initial data.
```bash
bun run migrate:reset
```

#### 5. Run the Application
```bash
# Development mode with hot-reloading
bun run start:dev
```
The application will be running on `http://localhost:3000`. The API documentation can be accessed at `http://localhost:3000/docs`.

## 🙌 A Note on Contributions

Thank you for your interest in Schematica. This project is "source-available" to serve as a professional showcase and a reference for modern backend architecture.

While the source is open for you to read, learn from, and adapt for your own projects (in accordance with the license), I am not actively accepting external pull requests at this time.

However, feedback and architectural discussions are always welcome. If you have ideas, questions, or spot a potential issue, please feel free to open an issue on the [issues page](https://github.com/amir-zouerami/schematica-api/issues). I will review them as time permits.