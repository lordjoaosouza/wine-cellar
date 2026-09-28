process.env.NODE_ENV ??= "test";
process.env.DATABASE_URL ??=
  "postgresql://wine_cellar:wine_cellar@localhost:5432/wine_cellar_test";
process.env.JWT_ACCESS_SECRET ??= "test-access-secret-0123456789-0123456789";
process.env.JWT_REFRESH_SECRET ??= "test-refresh-secret-0123456789-0123456789";
process.env.JWT_ACCESS_TTL ??= "15m";
process.env.JWT_REFRESH_TTL ??= "30d";
process.env.ENCRYPTION_KEY ??= Buffer.alloc(32, 7).toString("base64");
process.env.RESEND_API_KEY ??= "re_test";
process.env.EMAIL_FROM ??= "test@example.com";
process.env.UPLOADS_DIR ??= "test-uploads";
