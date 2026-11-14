import {NextRequest, NextResponse} from "next/server";
import {TableOrder} from "@/app/shared/model/TableOrder";
import {connectToDB} from "@/app/shared/lib/db";
import {withAuthRouteHandler} from "@/app/shared/lib/withAuthRouteHandler";
import {Order} from "@/app/shared/model/Order";
import {getResIdFromSlug} from "@/app/shared/util/util";

export const GET = withAuthRouteHandler(async (req: NextRequest, context: any, user: any) => {
    try {
        await connectToDB();
        const id = await getResIdFromSlug(context.params.slug);
        const result = await TableOrder.find({resId: id}).populate("orders").exec();
        return NextResponse.json(result);
    } catch (err: any) {
        return NextResponse.json({message: err.message}, {status: 500});
    }
});