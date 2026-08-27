# Remove Unused Admin Mock Pages

## Scope

Remove the three legacy admin pages that are not reachable from the current admin route: `AdminDashboardPage`, `AdminReportsPage`, and `AdminStaffPage`. Remove the complete `frontend/data/mock/` directory because its only consumers are those legacy pages.

## Constraints

- Keep the active `ContentAdminApp`, `OperationsAdminApp`, and `SecurityAdminApp` flows unchanged.
- Do not modify unrelated working-tree changes.
- Verify that no frontend source imports the removed mock module or pages.

## Verification

Run the frontend TypeScript check after deletion and search the frontend source for remaining imports/references.
