import {NextResponse} from "next/server";
import {TableOrder} from "@/app/shared/model/TableOrder";
import {Order} from "@/app/shared/model/Order";
import {Table} from "@/app/shared/model/Table";
import {Item} from "@/app/shared/model/Item";
import {connectToDB} from "@/app/shared/lib/db";
import {Overview} from "@/app/shared/types/Overview";

export async function GET() {
    try {
        await connectToDB();
        const numOfActiveTables = await Table.countDocuments({isEnabled: true});
        const numOfUnpaidOrders = await TableOrder.countDocuments({isPaid: false});
        const numOfTables = await Table.countDocuments();
        const numOfItems = await Item.countDocuments();
        const numOfOrders = await Order.countDocuments();
        const numOfPayments = await TableOrder.countDocuments({isPaid: true});

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
}