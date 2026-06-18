import { mutation } from "./_generated/server";
import { v } from "convex/values";

export const createPurchase = mutation({
    args: {
        userId: v.id("users"),
        courseId: v.id("courses"),
        amount: v.number(),
        purchaseDate: v.number(),
        stripePurchaseId: v.string(),
    },
    handler: async (ctx, args) => {
        return await ctx.db.insert("purchases", args);
    },
});