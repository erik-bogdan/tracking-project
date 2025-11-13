import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import * as schema from "./../database/schema"; // Importáld a séma objektumot
import { admin } from "better-auth/plugins"
import { db } from "./db";

export const auth = betterAuth({
    //baseURL: 'http://localhost:3000',
    trustedOrigins: ['http://localhost:3000', 'http://localhost:3001', "https://bpongcl.local:3001", "https://beta.bpong-cl.com", "https://bpong-cl.com","https://gorgeous-porpoise-kindly.ngrok-free.app", "https://tracker.bpong.hu"],
    database: drizzleAdapter(db, {
        schema,
        provider: "pg", // or "mysql", "postgresql", ...etc
    }),
    emailAndPassword: {
        enabled: true,
        sendResetPassword: async ({ user, url }) => {
           
        },
    },
    resetPassword: {
        enabled: true,
        redirectTo: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/reset-password`,
    },
    plugins: [
        admin(),
    ],
    user: {
        additionalFields: {
            role: {
                type: "string",
                required: false,
                defaultValue: "user",
                input: false, // don't allow user to set role
            },
            lang: {
                type: "string",
                required: false,
                defaultValue: "en",
            },
            organizationName: {
                type: "string",
                required: true,
                defaultValue: "",
                unique: false,
            },
        },
    },
    hooks: {
    },
});