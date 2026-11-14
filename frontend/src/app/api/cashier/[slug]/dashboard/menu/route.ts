import {NextRequest, NextResponse} from "next/server";
import {Item} from "@/app/shared/model/Item";
import {connectToDB} from "@/app/shared/lib/db";
import {withAuthRouteHandler} from "@/app/shared/lib/withAuthRouteHandler";
import {getResIdFromSlug} from "@/app/shared/util/util";

export const GET = withAuthRouteHandler(async (req: NextRequest, context: any, user: any) => {
    try {
        await connectToDB();
        const id = await getResIdFromSlug(context.params.slug);
        const result = await Item.find({resId: id});
        return NextResponse.json(result);
    } catch (err: any) {
        return NextResponse.json({message: err.message}, {status: 500});
    }
});