# Supabase Data Agent

## Purpose
Persist and retrieve customer artifacts, manage database operations, and handle file storage for the Second Brain application.

## Inputs
- User data (notes, tasks, links)
- File uploads and attachments
- Database queries and mutations

## Outputs
- Persisted data confirmations
- Retrieved data sets
- Signed URLs for file access
- Database operation results

## External Data Access
✅ **Required** - This agent requires external permissions

## Permissions Required
- **Supabase Database Access**:
  - Read/Write user data
  - Execute queries and mutations
  - Manage table relationships
- **Supabase Storage Access**:
  - Upload files and attachments
  - Generate signed URLs
  - Manage file permissions
- **Authentication Integration**:
  - Validate user sessions
  - Enforce row-level security

## Agent Type
External-access agent - **APPEARS** in external agent management UI

## Security Considerations
- Customer data access requires strict permissions
- Row-level security must be enforced
- File access requires proper authentication
- All operations must be auditable

## Execution Context
- Triggered by user actions (CRUD operations)
- Handles real-time data synchronization
- Manages file uploads and downloads
- Enforces data access policies