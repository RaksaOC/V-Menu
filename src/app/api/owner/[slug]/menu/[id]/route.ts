import {Item} from "@/app/shared/model/Item";
import {NextResponse} from "next/server";
import {withAuthRouteHandler} from "@/app/shared/lib/withAuthRouteHandler";

export const PUT = withAuthRouteHandler(async (req, context, user) => {
    const body = await req.json();
    const id = context.params.id;

    const updatedItem = await Item.findByIdAndUpdate(id, body);
    if (!updatedItem) {
        return NextResponse.json({message: "Could not update item"}, {status: 500});
    }

    return NextResponse.json(updatedItem);
});

export const DELETE = withAuthRouteHandler(async (req: Request, context: any) => {
    const params = context.params;
    const id = params.id;
    const deletedItem = await Item.findByIdAndDelete(id)
    if (!deletedItem) {
        return NextResponse.json({message: "Could not delete item", status: 500});
    }

    return NextResponse.json(deletedItem);
});
