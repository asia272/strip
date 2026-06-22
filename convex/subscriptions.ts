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
        userId: v.id("users"),
    },
    handler: async (ctx, args) => {
        // 1. Get subscription via userId index
        const subscription = await ctx.db
            .query("subscriptions")
            .withIndex("by_userId", (q) =>
                q.eq("userId", args.userId)
            )
            .unique();

        if (!subscription) {
            console.log("No subscription found for user");
            return;
        }

        // 2. Delete subscription
        await ctx.db.delete(subscription._id);

        // 3. Clear user reference safely
        const user = await ctx.db.get(args.userId);

        if (user?.currentSubscriptionId === subscription._id) {
            await ctx.db.patch(args.userId, {
                currentSubscriptionId: undefined,
            });
        }

        console.log("Subscription deleted successfully + user downgraded");

        return {
            success: true,
            deletedSubscriptionId: subscription._id,
        };
    },
});