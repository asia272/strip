import Stripe from "stripe";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { ConvexHttpClient } from "convex/browser";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
    apiVersion: "2025-05-27.dahlia" as any,
});

export async function POST(req: Request) {
    const body = await req.text();

    const sig = (await headers()).get("stripe-signature");

    if (!sig) {
        return NextResponse.json({ error: "Missing signature" }, { status: 400 });
    }

    let event: Stripe.Event;

    try {
        event = stripe.webhooks.constructEvent(
            body,
            sig,
            process.env.STRIPE_WEBHOOK_SECRET!
        );
        console.log("Webhook event:", event.type);
    } catch (err) {
        console.log("Webhook signature error:", err);
        return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
    }

    // ---------------- EVENTS ----------------

    switch (event.type) {

        case "checkout.session.completed":
            await handleCheckoutSessionCompleted(event.data.object as Stripe.Checkout.Session);
            break;
        case "customer.subscription.created":
        case "customer.subscription.updated":
            await handleSubscriptionUpsert(event.data.object as Stripe.Subscription, event.type);
            break;
        default:
            console.log(`Unhandled event type: ${event.type}`);
            break;
    }

    return NextResponse.json({ received: true });
}



async function handleCheckoutSessionCompleted(session: Stripe.Checkout.Session) {

    const courseId = session.metadata?.courseId;
    const userId = session.metadata?.userId;
    const stripePurchaseId = session.id;



    console.log("customer Id:", session.customer);
    console.log("Course Id:", courseId);

    if (!courseId || !userId) {
        console.log("Missing metadata, skipping purchase creation");
        return;
    }


    try {
        await convex.mutation(api.purchases.createPurchase, {
            userId: userId as Id<"users">,
            courseId: courseId as Id<"courses">,
            amount: session.amount_total as number,
            purchaseDate: Date.now(),
            stripePurchaseId,
        });

        console.log(" Purchase saved in Convex");
    } catch (err) {
        console.error(" Convex insert failed:", err);
    }
}
async function handleSubscriptionUpsert(
    subscription: Stripe.Subscription,
    eventType: string
) {
    if (subscription.status !== "active" || !subscription.latest_invoice) {
        console.log(`Skipping subscription ${subscription.id} - Status: ${subscription.status}`);
        return;
    }

    const stripeCustomerId =
        subscription.customer as string;

    const user = await convex.query(
        api.users.getUserByStripeCustomerId,
        {
            stripeCustomerId,
        }
    );

    if (!user) {
        throw new Error(
            `User not found for stripe customer id: ${stripeCustomerId}`
        );
    }

    const item = subscription.items.data[0];

    const planType =
        item.price.recurring?.interval === "year"
            ? "year"
            : "month";

    try {
        await convex.mutation(
            api.subscriptions.upsertSubscription,
            {
                userId: user._id,

                stripeSubscriptionId:
                    subscription.id,

                status:
                    subscription.status,

                planType,

                currentPeriodStart:
                    item.current_period_start *
                    1000,

                currentPeriodEnd:
                    item.current_period_end *
                    1000,

                cancelAtPeriodEnd:
                    subscription.cancel_at_period_end,
            }
        );

        console.log(
            `Successfully processed ${eventType} for subscription ${subscription.id}`
        );
    } catch (error) {
        console.error(
            `Failed processing ${eventType}`,
            error
        );
        throw error;
    }
}
