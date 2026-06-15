
import { query } from "./_generated/server";

export const getAllCourses = query({
    args: {},
    handler: async (ctx) => {
        return await ctx.db.query("courses").collect();
    },
});