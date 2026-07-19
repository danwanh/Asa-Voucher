truncate table
  public.issued_vouchers,
  public.payment_logs,
  public.order_logs,
  public.payments,
  public.order_items,
  public.orders,
  public.cart_items,
  public.carts,
  public.voucher_product_branches,
  public.voucher_product_images,
  public.voucher_products,
  public.categories,
  public.partner_branches,
  public.partners,
  public.admin_logs,
  public.authentication_logs,
  public.refresh_tokens,
  public.users
restart identity cascade;

-- All seed users use password: Password123!
insert into public.users (id, email, phone, password_hash, full_name, role, is_active, is_verified, city, district)
values
  ('00000000-0000-0000-0000-000000000001', 'buyer@asa.test', '0900000001', 'scrypt:seed-salt:112af16d62c620e828f2f0a1d498e531dd8e94b47030a2d56ac13d45102ffa0d548e7c70e4e1b9de2553b88d41c616a7d980e7bf358ec442aa59c6d0e45711a9', 'Seed Buyer', 'buyer', true, true, 'Ho Chi Minh', 'District 1'),
  ('00000000-0000-0000-0000-000000000002', 'partner.owner@asa.test', '0900000002', 'scrypt:seed-salt:112af16d62c620e828f2f0a1d498e531dd8e94b47030a2d56ac13d45102ffa0d548e7c70e4e1b9de2553b88d41c616a7d980e7bf358ec442aa59c6d0e45711a9', 'Seed Partner Owner', 'partner_owner', true, true, 'Ho Chi Minh', 'District 3'),
  ('00000000-0000-0000-0000-000000000005', 'admin.content@asa.test', '0900000005', 'scrypt:seed-salt:112af16d62c620e828f2f0a1d498e531dd8e94b47030a2d56ac13d45102ffa0d548e7c70e4e1b9de2553b88d41c616a7d980e7bf358ec442aa59c6d0e45711a9', 'Seed Admin Content', 'admin_content', true, true, 'Ho Chi Minh', 'District 1'),
  ('00000000-0000-0000-0000-000000000006', 'admin.account@asa.test', '0900000006', 'scrypt:seed-salt:112af16d62c620e828f2f0a1d498e531dd8e94b47030a2d56ac13d45102ffa0d548e7c70e4e1b9de2553b88d41c616a7d980e7bf358ec442aa59c6d0e45711a9', 'Seed Admin Account', 'admin_account', true, true, 'Ho Chi Minh', 'District 1'),
  ('00000000-0000-0000-0000-000000000007', 'admin.security@asa.test', '0900000007', 'scrypt:seed-salt:112af16d62c620e828f2f0a1d498e531dd8e94b47030a2d56ac13d45102ffa0d548e7c70e4e1b9de2553b88d41c616a7d980e7bf358ec442aa59c6d0e45711a9', 'Seed Admin Security', 'admin_security', true, true, 'Ho Chi Minh', 'District 1'),
  ('00000000-0000-0000-0000-000000000008', 'pending.owner@asa.test', '0900000008', 'scrypt:seed-salt:112af16d62c620e828f2f0a1d498e531dd8e94b47030a2d56ac13d45102ffa0d548e7c70e4e1b9de2553b88d41c616a7d980e7bf358ec442aa59c6d0e45711a9', 'Seed Pending Partner Owner', 'partner_owner', true, true, 'Ho Chi Minh', 'District 5');

insert into public.partners (id, representative_user_id, business_name, business_code, business_type, tax_number, logo_url, website_url, description, approval_status, status, approved_by, approved_at)
values
  ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000002', 'Seed Coffee Partner', 'BIZ-SEED-001', 'restaurant', 'TAX-SEED-001', 'https://example.com/logo.png', 'https://example.com', 'Approved seed partner for API tests', 'approved', 'active', '00000000-0000-0000-0000-000000000006', now()),
  ('10000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000008', 'Pending Spa Partner', 'BIZ-SEED-002', 'spa', 'TAX-SEED-002', null, null, 'Pending partner for negative tests', 'pending', 'active', null, null);

insert into public.partner_branches (id, partner_id, branch_name, address, city, district, phone, latitude, longitude, is_active)
values
  ('20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'Seed Coffee District 1', '1 Nguyen Hue', 'Ho Chi Minh', 'District 1', '0280000001', 10.7758, 106.7009, true),
  ('20000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000001', 'Seed Coffee District 3', '2 Vo Van Tan', 'Ho Chi Minh', 'District 3', '0280000002', 10.7829, 106.6871, true);

insert into public.users (id, email, phone, password_hash, full_name, role, is_active, is_verified, partner_branches_id, city, district)
values
  ('00000000-0000-0000-0000-000000000003', 'voucher.staff@asa.test', '0900000003', 'scrypt:seed-salt:112af16d62c620e828f2f0a1d498e531dd8e94b47030a2d56ac13d45102ffa0d548e7c70e4e1b9de2553b88d41c616a7d980e7bf358ec442aa59c6d0e45711a9', 'Seed Voucher Staff', 'partner_voucher_staff', true, true, '20000000-0000-0000-0000-000000000001', 'Ho Chi Minh', 'District 1'),
  ('00000000-0000-0000-0000-000000000004', 'store.staff@asa.test', '0900000004', 'scrypt:seed-salt:112af16d62c620e828f2f0a1d498e531dd8e94b47030a2d56ac13d45102ffa0d548e7c70e4e1b9de2553b88d41c616a7d980e7bf358ec442aa59c6d0e45711a9', 'Seed Store Staff', 'partner_store_staff', true, true, '20000000-0000-0000-0000-000000000001', 'Ho Chi Minh', 'District 1');

insert into public.categories (id, parent_id, name, slug, description, sort_order)
values
  ('30000000-0000-0000-0000-000000000001', null, 'Food & Beverage', 'food-beverage', 'Food and drink vouchers', 1),
  ('30000000-0000-0000-0000-000000000002', null, 'Spa & Beauty', 'spa-beauty', 'Spa and beauty vouchers', 2);

insert into public.voucher_products (
  id, partner_id, category_id, name, description, thumbnail_url, original_price, selling_price, discount_rate,
  applicable_area, total_quantity, remaining_quantity, terms_and_conditions, usage_instructions,
  sale_start_date, sale_end_date, validity_days, status, approval_status, approved_by, approved_at
)
values
  ('40000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000001', 'Seed Coffee 100k Voucher', 'Use for drinks and cakes', 'https://example.com/coffee.jpg', 100000, 75000, 25, 'Ho Chi Minh', 100, 98, '{"note":"One voucher per bill"}', '{"steps":["Show QR code at cashier"]}', current_date - interval '1 day', current_date + interval '30 days', 30, 'active', 'approved', '00000000-0000-0000-0000-000000000005', now()),
  ('40000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000001', 'Seed Draft Coffee Voucher', 'Draft voucher for partner update tests', null, 150000, 120000, 20, 'Ho Chi Minh', 50, 50, null, null, current_date, current_date + interval '60 days', 45, 'draft', 'pending', null, null),
  ('40000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000002', '30000000-0000-0000-0000-000000000002', 'Pending Partner Spa Voucher', 'Voucher owned by pending partner', null, 500000, 350000, 30, 'Ho Chi Minh', 20, 20, null, null, current_date, current_date + interval '30 days', 30, 'draft', 'pending', null, null);

insert into public.voucher_product_images (id, voucher_product_id, image_url, is_primary, sort_order)
values
  ('50000000-0000-0000-0000-000000000001', '40000000-0000-0000-0000-000000000001', 'https://example.com/coffee-1.jpg', true, 1),
  ('50000000-0000-0000-0000-000000000002', '40000000-0000-0000-0000-000000000001', 'https://example.com/coffee-2.jpg', false, 2);

insert into public.voucher_product_branches (id, voucher_product_id, branch_id)
values
  ('60000000-0000-0000-0000-000000000001', '40000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001'),
  ('60000000-0000-0000-0000-000000000002', '40000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000002');

insert into public.carts (id, user_id)
values ('70000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001');

insert into public.cart_items (id, cart_id, voucher_product_id, quantity)
values ('71000000-0000-0000-0000-000000000001', '70000000-0000-0000-0000-000000000001', '40000000-0000-0000-0000-000000000001', 1);

insert into public.orders (id, order_code, user_id, subtotal, discount_amount, total_amount, payment_method, payment_status, status, note)
values
  ('80000000-0000-0000-0000-000000000001', 'ORD-SEED-PAID', '00000000-0000-0000-0000-000000000001', 150000, 0, 150000, 'bank_transfer', 'paid', 'confirmed', 'Paid seed order'),
  ('80000000-0000-0000-0000-000000000002', 'ORD-SEED-PENDING', '00000000-0000-0000-0000-000000000001', 75000, 0, 75000, 'bank_transfer', 'pending', 'pending', 'Pending seed order');

insert into public.order_items (id, order_id, voucher_product_id, quantity, unit_price, snapped_original_price, snapped_selling_price, snapped_discount_rate, subtotal)
values
  ('81000000-0000-0000-0000-000000000001', '80000000-0000-0000-0000-000000000001', '40000000-0000-0000-0000-000000000001', 2, 75000, 100000, 75000, 25, 150000),
  ('81000000-0000-0000-0000-000000000002', '80000000-0000-0000-0000-000000000002', '40000000-0000-0000-0000-000000000001', 1, 75000, 100000, 75000, 25, 75000);

insert into public.payments (id, order_id, method, amount, status, transaction_ref, gateway_response, paid_at)
values
  ('90000000-0000-0000-0000-000000000001', '80000000-0000-0000-0000-000000000001', 'bank_transfer', 150000, 'success', 'SIM-SEED-PAID', 'seed success', now()),
  ('90000000-0000-0000-0000-000000000002', '80000000-0000-0000-0000-000000000002', 'bank_transfer', 75000, 'pending', null, null, null);

insert into public.issued_vouchers (id, voucher_code, qr_code_payload, order_item_id, voucher_product_id, owner_id, issued_date, expired_date, status)
values
  ('a0000000-0000-0000-0000-000000000001', 'VC-SEED-001', 'VC-SEED-001', '81000000-0000-0000-0000-000000000001', '40000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', current_date, current_date + interval '30 days', 'active'),
  ('a0000000-0000-0000-0000-000000000002', 'VC-SEED-002', 'VC-SEED-002', '81000000-0000-0000-0000-000000000001', '40000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', current_date, current_date + interval '30 days', 'active');

insert into public.order_logs (order_id, user_id, action, description)
values
  ('80000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'CREATE_ORDER', 'Seed paid order'),
  ('80000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001', 'CREATE_ORDER', 'Seed pending order');

insert into public.payment_logs (payment_id, order_id, user_id, action, status, amount)
values
  ('90000000-0000-0000-0000-000000000001', '80000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'PAYMENT_SUCCESS', 'success', 150000),
  ('90000000-0000-0000-0000-000000000002', '80000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001', 'PAYMENT_CREATED', 'pending', 75000);
