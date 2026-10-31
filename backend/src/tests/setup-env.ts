// Test environment. Loaded before any test file imports src/config/env.ts.
// Values use ||= so the integration config can supply a real test database.
// SMTP / SendGrid / Resend / PayPal / Cloudinary are left unset on purpose:
// an accidental call fails instead of reaching a real service.
process.env.NODE_ENV ||= "test";
process.env.DATABASE_URL ||= "postgresql://test:test@localhost:5432/test";
process.env.DIRECT_URL ||= process.env.DATABASE_URL;
process.env.JWT_SECRET ||= "test-jwt-secret";
process.env.FRONTEND_URL ||= "http://localhost:3000";
process.env.EMAIL_PROVIDER ||= "smtp";

process.env.VNPAY_TMN_CODE ||= "TESTTMN1";
process.env.VNPAY_HASH_SECRET ||= "TESTVNPAYHASHSECRET";
process.env.VNPAY_URL ||= "https://sandbox.vnpayment.vn/paymentv2/vpcpay.html";
process.env.VNPAY_RETURN_URL ||= "http://localhost:5000/api/v1/payments/vnpay/return";
