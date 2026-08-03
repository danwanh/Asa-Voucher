UPDATE "users"
SET "role" = 'admin_operations'
WHERE "role" = 'admin_account';

UPDATE "users"
SET "email" = 'admin.operations@asa.test'
WHERE "email" = 'admin.account@asa.test';
