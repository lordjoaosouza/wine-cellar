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
process.env.MINIO_ENDPOINT ??= "http://localhost:9000";
process.env.MINIO_ACCESS_KEY ??= "wine_cellar";
process.env.MINIO_SECRET_KEY ??= "wine_cellar_minio";
process.env.MINIO_BUCKET ??= "wine-cellar-test";
process.env.PUBLIC_URL ??= "http://localhost:3000";
