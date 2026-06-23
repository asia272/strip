import { mutation } from "./_generated/server";

export const clearSubscriptions = mutation({
    handler: async (ctx) => {
        const all = await ctx.db.query("subscriptions").collect();

        for (const doc of all) {
            await ctx.db.delete(doc._id);
        }

        return { deleted: all.length };
    },
});