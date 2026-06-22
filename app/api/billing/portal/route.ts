import Stripe from "stripe";
import { NextResponse } from "next/server";
import { ConvexHttpClient } from "convex/browser";
import { api } from "@/convex/_generated/api";
import stripe from "@/lib/stripe";

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);



export async function POST(req: Request) {
    try {

        const { clerkId } = await req.json();

        if (!clerkId) {
            return NextResponse.json({ error: "Missing user" }, { status: 400 });
        }

        // 1. Get user from Convex
        const user = await convex.query(api.users.getUserByClerkId, {
            clerkId,
        });

        if (!user) {
            return NextResponse.json({ error: "User not found" }, { status: 404 });
        }

        if (!user.stripeCustomerId) {
            return NextResponse.json({ error: "No Stripe customer found" }, { status: 400 });
        }

        // 2. Create billing portal session
        const session = await stripe.billingPortal.sessions.create({
            customer: user.stripeCustomerId,
            return_url: `${process.env.NEXT_PUBLIC_APP_URL}/billing`,
        });

        return NextResponse.json({ url: session.url });

    } catch (error) {
        console.error("Billing portal error:", error);
        return NextResponse.json(
            { error: "Failed to create billing portal" },
            { status: 500 }
        );
    }
}