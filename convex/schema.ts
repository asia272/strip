import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { title } from "process";
export default defineSchema({
    //  Users table
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

    //Courses table
    courses: defineTable({
        title: v.string(),
        description: v.string(),
        imageUrl: v.string(),
        price: v.number(),
    }),
})