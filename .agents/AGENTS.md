# Repository Notes

- Simple npm-workspaces monorepo: `frontend/` is Next.js, `backend/` is Express.js, and each app must also run independently from its own folder.
- Use npm consistently; do not add pnpm/yarn lockfiles unless the repo intentionally switches package managers.
- Protected workflows must go through `backend/`; do not call Supabase directly from frontend components for admin, payment, voucher issuance, voucher validation, or audit-log flows.
- Backend code belongs in `controllers`, `services`, `repositories`, `routes`, `validations`, and `middlewares`; do not put business logic directly in route files.
- Keep auth, RBAC, request logging, validation, centralized error handling, and audit logging as shared middleware/service concerns.
- Database design reference is `docs/db.md`. If schema concepts change, keep the ERDs, data dictionary, and enum reference aligned.
- Never commit real secrets. Only `.env.example` files should contain safe placeholder values.
