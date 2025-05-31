import {NextRequest, NextResponse} from "next/server";
import {TableOrder} from "@/app/shared/model/TableOrder";
import {Order} from "@/app/shared/model/Order";
import {Table} from "@/app/shared/model/Table";
import {Item} from "@/app/shared/model/Item";
import {connectToDB} from "@/app/shared/lib/db";
import {Overview} from "@/app/shared/types/Overview";
import {withAuthRouteHandler} from "@/app/shared/lib/withAuthRouteHandler";
import {getResIdFromSlug} from "@/app/shared/util/util";

export const GET = withAuthRouteHandler(async (req: NextRequest, context: any, user: any) => {
    try {
        await connectToDB();
        const id = await getResIdFromSlug(context.params.slug);
        const numOfActiveTables = await Table.countDocuments({isEnabled: true, resId: id});
        const numOfUnpaidOrders = await TableOrder.countDocuments({isPaid: false, resId: id});
        const numOfTables = await Table.countDocuments({resId: id});
        const numOfItems = await Item.countDocuments({resId: id});
        const numOfOrders = await Order.countDocuments({resId: id});
        const numOfPayments = await TableOrder.countDocuments({isPaid: true, resId: id});

        const overviewData: Overview = {
            numOfActiveTables,
            numOfUnpaidOrders,
            numOfTables,
            numOfItems,
            numOfOrders,
            numOfPayments,
        }

        return NextResponse.json(overviewData);

    } catch (err: any) {
        return NextResponse.json({message: err.message}, {status: 500});
    }
})