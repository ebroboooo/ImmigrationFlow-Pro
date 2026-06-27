# ClientFlow CRM Setup Guide

## Project Architecture

ClientFlow CRM is built using a clean architecture approach to ensure scalability and maintainability.

### Presentation Layer
Built with React 18, TypeScript, and TailwindCSS. Uses Context API for global state management (Auth, Theme, Repositories).

### Domain Layer
Contains TypeScript interfaces and types for core business entities: `User`, `Tenant`, `Customer`, `Lead`, `Deal`, `Task`, `Activity`, and `Proposal`.
It also defines generic `IRepository` interfaces for data access.

### Infrastructure Layer (Repositories)
The Repository Pattern abstracts data access. This allows the application to switch between a mock backend and a real database (like Firebase) without changing UI components.

#### Mock Repository
Currently, the application uses a `MockRepository` implementation that persists data to `localStorage`. This allows the application to be fully functional immediately after launch without any backend setup.

#### Firebase Repository (Future)
To switch to Firebase, you would implement the `IRepository` interfaces using the Firebase SDK and update the `RepositoryContext.tsx` to provide the Firebase repositories instead of the mock ones.

### Switching Repositories
1. Open `src/presentation/contexts/RepositoryContext.tsx`.
2. Replace `mockRepositories` with your new repository factory instance (e.g., `firebaseRepositories`).
