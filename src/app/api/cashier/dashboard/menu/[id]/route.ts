import {NextRequest, NextResponse} from "next/server";
import {connectToDB} from "@/app/shared/lib/db";
import {Item} from "@/app/shared/model/Item";
import mongoose from "mongoose";

// Don't destructure `params` in the function signature
export async function PATCH(req: NextRequest, context: any) {
    try {

        await connectToDB();
        console.log(mongoose.connection.name);
        // Access `params` here safely
        const params = await context.params;
        const id = params.id;

        console.log(id);

        console.log("Updating:", id);
        const allItems = await Item.find();
        console.log("All Items:", allItems);
        const existing = await Item.findById(id);
        console.log("Found?", existing);

        const body = await req.json();
        const isEnabled = body.isEnabled;
        console.log(isEnabled);

        const updatedItem = await Item.findByIdAndUpdate(
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
}
