import {Table} from "@/app/shared/model/Table";
import {NextResponse} from "next/server";
import {TableInput} from "@/app/shared/types/Table";
import {withAuthRouteHandler} from "@/app/shared/lib/withAuthRouteHandler";

export const PUT = withAuthRouteHandler(async (req: Request, context: any, user: any) => {
    const body: TableInput = await req.json();
    const params = context.params;
    const id = params.id;
    const updatedItem = await Table.findByIdAndUpdate(
        id,
        body
    )
    if (!updatedItem) {
        return NextResponse.json({message: "Could not update item", status: 500});
    }

    return NextResponse.json(updatedItem);
});

export const DELETE = withAuthRouteHandler(async (req: Request, context: any, user: any) => {
        const params = context.params;
        const id = params.id;
        const deletedItem = await Table.findByIdAndDelete(id)
        if (!deletedItem) {
            return NextResponse.json({message: "Could not delete item", status: 500});
        }

        return NextResponse.json(deletedItem);
    }
);

