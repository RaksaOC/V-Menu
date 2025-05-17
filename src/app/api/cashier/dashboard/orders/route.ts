import {NextRequest, NextResponse} from "next/server";
import {TableOrder} from "@/app/shared/model/TableOrder";
import {connectToDB} from "@/app/shared/lib/db";
import {withAuthRouteHandler} from "@/app/shared/lib/withAuthRouteHandler";
import {Order} from "@/app/shared/model/Order";

export const GET = withAuthRouteHandler(async (req: NextRequest, context: any, user: any) => {
    try {
        await connectToDB();
        const result = await TableOrder.find({resId: user.resId}).populate("orders").exec();
        return NextResponse.json(result);
    } catch (err: any) {
        return NextResponse.json({message: err.message}, {status: 500});
    }
});