import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const getUserSubscription = query({
    args: { userId: v.id("users") },
    handler: async (ctx, args) => {
        const user = await ctx.db.get(args.userId);
        if (!user?.currentSubscriptionId) return null;

        const subscription = await ctx.db.get(user.currentSubscriptionId);
        if (!subscription) return null;

        return subscription;
    },
});



export const upsertSubscription = mutation({
    args: {
        userId: v.id("users"),

        planType: v.union(
            v.literal("month"),
            v.literal("year")
        ),

        currentPeriodStart: v.number(),
        currentPeriodEnd: v.number(),

        stripeSubscriptionId: v.string(),

        status: v.string(),

        cancelAtPeriodEnd: v.boolean(),
    },

    handler: async (ctx, args) => {
        //check existing
        const existing = await ctx.db
            .query("subscriptions")
            .withIndex(
                "by_stripeSubscriptionId",
                (q) =>
                    q.eq(
                        "stripeSubscriptionId",
                        args.stripeSubscriptionId
                    )
            )
            .unique();

        if (existing) {
            await ctx.db.patch(existing._id, args);
            return existing._id;
        }

        const subscriptionId = await ctx.db.insert("subscriptions", args);

        await ctx.db.patch(args.userId, { currentSubscriptionId: subscriptionId, });

        return subscriptionId;
    },
});



export const deleteSubscription = mutation({
    args: {
        stripeSubscriptionId: v.string(),
    },

    handler: async (ctx, args) => {
        // 1. Find subscription using Stripe ID (your ONLY index)
        const subscription = await ctx.db
            .query("subscriptions")
            .withIndex("by_stripeSubscriptionId", (q) =>
                q.eq("stripeSubscriptionId", args.stripeSubscriptionId)
            )
            .unique();

        if (!subscription) {
            console.log("Subscription not found");
            return;
        }

        // 2. Delete subscription
        await ctx.db.delete(subscription._id);

        // 3. Find user linked to this subscription
        const user = await ctx.db.get(subscription.userId);

        if (user) {
            await ctx.db.patch(user._id, {
                currentSubscriptionId: undefined,
            });
        }

        console.log("Subscription deleted + user downgraded");

        return {
            success: true,
            deletedSubscriptionId: subscription._id,
        };
    },
});