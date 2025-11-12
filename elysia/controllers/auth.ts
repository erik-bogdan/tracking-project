import { Elysia, Context } from "elysia";
import { auth } from "../lib/auth";

// Better Auth handler for Elysia
const betterAuthView = (context: Context) => {
    const BETTER_AUTH_ACCEPT_METHODS = ["POST", "GET"];
    // Validate request method
    if (BETTER_AUTH_ACCEPT_METHODS.includes(context.request.method)) {
        return auth.handler(context.request);
    } else {
        context.set.status = 405;
        return new Response("Method Not Allowed", { status: 405 });
    }
};

export const authController = new Elysia({ prefix: '/auth' })
    .all("/*", betterAuthView);








