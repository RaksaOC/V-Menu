import {NextRequest, NextResponse} from "next/server";
import {connectToDB} from "@/app/shared/lib/db";
import {TableOrder} from "@/app/shared/model/TableOrder";

// Don't destructure `params` in the function signature
export async function PATCH(req: NextRequest, context: any) {
    try {

        await connectToDB();

        // Access `params` here safely
        const params = await context.params;
        const id = params.id;

        const body = await req.json();
        const isPayed = body.isPayed;


        const updatedItem = await TableOrder.findByIdAndUpdate(
            id,
            {isPayed: !isPayed},
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
