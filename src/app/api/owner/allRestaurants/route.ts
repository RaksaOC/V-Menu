import {NextRequest, NextResponse} from "next/server";
import {TableOrder} from "@/app/shared/model/TableOrder";
import {Order} from "@/app/shared/model/Order";
import {Table} from "@/app/shared/model/Table";
import {Item} from "@/app/shared/model/Item";
import {connectToDB} from "@/app/shared/lib/db";
import {Overview} from "@/app/shared/types/Overview";
import {withAuthRouteHandler} from "@/app/shared/lib/withAuthRouteHandler";
import {getResIdFromSlug, getResNameFromId} from "@/app/shared/util/util";
import {Restaurant} from "@/app/shared/model/Restaurant";

export const GET = withAuthRouteHandler(async (req: NextRequest, context: any, user: any) => {
    try {
        await connectToDB();
        const res = await Restaurant.find({ownerId: user.uid});
        const resIds = res.map(r => r._id);
        let allRes = [];
        for (const id of resIds) {
            const resName = await getResNameFromId(id);
            const numOfActiveTables = await Table.countDocuments({isEnabled: true, resId: id});
            const numOfUnpaidOrders = await TableOrder.countDocuments({isPaid: false, resId: id});
            const numOfTables = await Table.countDocuments({resId: id});
            const numOfItems = await Item.countDocuments({resId: id});
            const numOfOrders = await Order.countDocuments({resId: id});
            const numOfPayments = await TableOrder.countDocuments({isPaid: true, resId: id});
            const overviewData: any = {
                resName,
                numOfActiveTables,
                numOfUnpaidOrders,
                numOfTables,
                numOfItems,
                numOfOrders,
                numOfPayments,
            }
            allRes.push(overviewData);
        }


        return NextResponse.json(allRes);

    } catch (err: any) {
        return NextResponse.json({message: err.message}, {status: 500});
    }
})