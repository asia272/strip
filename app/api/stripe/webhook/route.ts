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
    } catch (err) {
        console.log("Webhook signature error:", err);
        return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
    }

    // ---------------- EVENTS ----------------

    switch (event.type) {

        case "checkout.session.completed": {
            await handleCheckoutSessionCompleted(event.data.object as Stripe.Checkout.Session);


            break;
        }
        case "payment_intent.succeeded": {
            const paymentIntent = event.data.object as Stripe.PaymentIntent;
            console.log("PaymentIntent success:", paymentIntent.id);
            break;
        }

        default:
            console.log("Unhandled event:", event.type);
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
