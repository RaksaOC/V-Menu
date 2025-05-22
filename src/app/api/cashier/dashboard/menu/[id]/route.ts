import {NextRequest, NextResponse} from "next/server";
import {connectToDB} from "@/app/shared/lib/db";
import {Item} from "@/app/shared/model/Item";
import mongoose from "mongoose";
import {withAuthRouteHandler} from "@/app/shared/lib/withAuthRouteHandler";

// Don't destructure `params` in the function signature
export const PATCH = withAuthRouteHandler(async (req: NextRequest, context: any, user: any) => {
    try {

        await connectToDB();
        const params = await context.params;
        const id = params.id;

        const body = await req.json();
        const isEnabled = body.isEnabled;

        const updatedItem = await Item.findByIdAndUpdate(
            id,
            {isEnabled: !isEnabled},
            {new: true}
        );

        if (!updatedItem) {
            return NextResponse.json({message: "Failed to update item", status: 500});
        }

        return NextResponse.json(updatedItem);
    } catch (error) {
        console.error("PATCH error:", error);
        return NextResponse.json({message: "Failed to update item", status: 500});
    }
})
