import {NextRequest, NextResponse} from "next/server";
import {connectToDB} from "@/app/shared/lib/db";
import {Item} from "@/app/shared/model/Item";
import mongoose from "mongoose";
import {Table} from "@/app/shared/model/Table";
import {withAuthRouteHandler} from "@/app/shared/lib/withAuthRouteHandler";

// Don't destructure `params` in the function signature
export const PATCH =  withAuthRouteHandler(async (req: NextRequest, context: any, user: any) => {
    try {

        await connectToDB();

        // Access `params` here safely
        const params = await context.params;
        const id = params.id;

        const body = await req.json();
        const isEnabled = body.isEnabled;
        console.log(isEnabled);

        const updatedItem = await Table.findByIdAndUpdate(
            id,
            {isEnabled: !isEnabled},
            {new: true}
        );

        console.log(updatedItem);

        if (!updatedItem) {
            return NextResponse.json({message: "Failed to update item", status: 500});
        }

        return NextResponse.json(updatedItem);
    } catch (error) {
        console.error("PATCH error:", error);
        return NextResponse.json({message: "Failed to update item", status: 500});
    }
})
