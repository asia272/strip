import { v } from "convex/values";
import { action } from "./_generated/server";
import { ConvexError } from "convex/values";
import stripe from "../lib/stripe";
import { api } from "./_generated/api";
import { checkoutRateLimit } from "../lib/ratelimit";

export const createCheckoutSession = action({
    args: {
        courseId: v.id("courses"),
    },

    handler: async (ctx, args) => {
        // 1. Auth
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) throw new ConvexError("Unauthorized");

        // 2. Get user via mutation (IMPORTANT FIX)
        const user = await ctx.runQuery(
            api.users.getUserByClerkId,
            {
                clerkId: identity.subject,
            }
        );

        if (!user) throw new ConvexError("User not found");

        // 3. Get course 
        const course = await ctx.runQuery(
            api.courses.getCourseById,
            {
                courseId: args.courseId,
            }
        );

        if (!course) throw new ConvexError("Course not found");

        //4 Rate limit check   that prevent user to create too many request
        const { success } = await checkoutRateLimit.limit(
            `checkout:${user._id}`
        );

        if (!success) {
            throw new Error(`Rate limit exceeded.`);
        }
        // 5. Stripe session
        const session = await stripe.checkout.sessions.create({
            customer: user.stripeCustomerId,
            payment_method_types: ["card"],
            mode: "payment",


            line_items: [
                {
                    price_data: {
                        currency: "usd",
                        product_data: {
                            name: course.title,
                            description: course.description || "",
                            images: course.imageUrl ? [course.imageUrl] : [],
                        },
                        unit_amount: Math.round(course.price * 100),
                    },
                    quantity: 1,
                },
            ],
            metadata: {
                courseId: args.courseId,
                userId: user._id,
            },
            success_url: `${process.env.NEXT_PUBLIC_APP_URL}/courses/${args.courseId}/success?session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/courses`,
        });

        return { checkoutUrl: session.url };
    },
});