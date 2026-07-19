alter table public.users drop constraint if exists users_role_check;

update public.users set role = 'partner_owner' where role = 'partner_manager';
update public.users set role = 'partner_store_staff' where role = 'store_staff';

alter table public.users
  add constraint users_role_check
  check (role in ('buyer', 'partner_owner', 'partner_voucher_staff', 'partner_store_staff', 'admin_content', 'admin_account', 'admin_security'));
