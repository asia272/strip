import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { Webhook } from "svix";
import { api } from "./_generated/api";
import stripe from "../lib/stripe";

const http = httpRouter();

http.route({
    path: "/webhook",
    method: "POST",
    handler: httpAction(async (ctx, request) => {
        const webhookSecret = process.env.CLERK_WEBHOOK_SECRET;

        if (!webhookSecret) {
            throw new Error("Missing CLERK_WEBHOOK_SECRET");
        }

        const svixId = request.headers.get("svix-id");
        const svixTimestamp = request.headers.get("svix-timestamp");
        const svixSignature = request.headers.get("svix-signature");

        if (!svixId || !svixTimestamp || !svixSignature) {
            return new Response("Missing Svix headers", {
                status: 400,
            });
        }

        const payload = await request.text();

        const wh = new Webhook(webhookSecret);

        let event: any;

        try {
            event = wh.verify(payload, {
                "svix-id": svixId,
                "svix-timestamp": svixTimestamp,
                "svix-signature": svixSignature,
            });
        } catch (err) {
            console.error("Webhook verification failed:", err);

            return new Response("Invalid signature", {
                status: 400,
            });
        }

        if (event.type === "user.created") {

            const { id, email_addresses, first_name, last_name } = evt.data;
            const email = email_addresses[0]?.email_address;
            const name = `${first_name || ""} ${last_name || ""}`.trim();

            const customer = await stripe.customers.create({
                email,
                name,
                metadata: { clerkId: id },
            });


            await ctx.runMutation(api.users.createUser, {
                email,
                name,
                clerkId: id,
                stripeCustomerId: customer.id,
            });
        }


        return new Response("Webhook processed", {
            status: 200,
        });
    }),
});

export default http;