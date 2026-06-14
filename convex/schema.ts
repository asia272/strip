import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
export default defineSchema({
    users: defineTable({
        email: v.string(),
        name: v.string(),
        clerkId: v.string(),
        // stripeCustomerId: v.string(),
        currentSubscriptionId: v.optional(v.id("subscriptions")),
    })
        .index("by_clerkId", ["clerkId"])
        // .index("by_stripeCustomerId", ["stripeCustomerId"])
        .index("by_currentSubscriptionId", ["currentSubscriptionId"]),
})