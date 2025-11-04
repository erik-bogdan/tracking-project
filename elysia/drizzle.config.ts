import { Config, defineConfig } from "drizzle-kit";

export default defineConfig({
    schema: "./database/*",
    out: "./drizzle",
    dialect: 'postgresql',
    dbCredentials: {
        url: process.env.DATABASE_URL_DRIZZLE ?? '',
    }
}) as Config;