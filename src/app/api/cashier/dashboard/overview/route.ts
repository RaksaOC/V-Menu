import {NextRequest, NextResponse} from "next/server";
import {TableOrder} from "@/app/shared/model/TableOrder";
import {Order} from "@/app/shared/model/Order";
import {Table} from "@/app/shared/model/Table";
import {Item} from "@/app/shared/model/Item";
import {connectToDB} from "@/app/shared/lib/db";
import {Overview} from "@/app/shared/types/Overview";
import {withAuthRouteHandler} from "@/app/shared/lib/withAuthRouteHandler";

export const GET = withAuthRouteHandler(async (req: NextRequest, context: any, user: any) => {
    try {
        await connectToDB();
        const numOfActiveTables = await Table.countDocuments({isEnabled: true, tenantId: user.uid});
        const numOfUnpaidOrders = await TableOrder.countDocuments({isPaid: false, tenantId: user.uid});
        const numOfTables = await Table.countDocuments({tenantId: user.uid});
        const numOfItems = await Item.countDocuments({tenantId: user.uid});
        const numOfOrders = await Order.countDocuments({tenantId: user.uid});
        const numOfPayments = await TableOrder.countDocuments({isPaid: true, tenantId: user.uid});

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