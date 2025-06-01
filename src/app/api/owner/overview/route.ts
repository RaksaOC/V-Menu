import {withAuthRouteHandler} from "@/app/shared/lib/withAuthRouteHandler";
import {Restaurant} from "@/app/shared/model/Restaurant";
import {NextResponse} from "next/server";
import {TableOrder} from "@/app/shared/model/TableOrder";
import {Item} from "@/app/shared/model/Item";
import {Order} from "@/app/shared/model/Order";

// export const GET = withAuthRouteHandler(async (req: Request, context: any, user: any) => {
//     try {
//         const ownedRes = await Restaurant.find({ownerId: user.uid});
//         const resIds = ownedRes.map(res => res._id.toString());
//
//         let stats = {
//             numOfUnpaidOrders: 0,
//             numOfItems: 0,
//             numOfOrders: 0,
//             numOfPayments: 0,
//             numOfMoneyEarned: 0,
//             totalItemsSold: 0,
//             topItemsMap: new Map<string, number>(), // itemName → quantity
//         };
//
//         for (const resId of resIds) {
//             // Count basic data
//             stats.numOfUnpaidOrders += await TableOrder.countDocuments({isPaid: false, resId});
//             stats.numOfPayments += await TableOrder.countDocuments({isPaid: true, resId});
//             stats.numOfItems += await Item.countDocuments({resId});
//             stats.numOfOrders += await Order.countDocuments({resId});
//
//             // Get completed orders
//             const completedOrders = await Order.find({resId, isDone: true}).populate('orderedItems.item');
//
//             for (const order of completedOrders) {
//                 for (const entry of order.orderedItems) {
//                     const item = entry.item;
//                     const quantity = entry.quantity || 0;
//
//                     if (!item || !item.price) continue;
//
//                     // Total money
//                     stats.numOfMoneyEarned += item.price * quantity;
//
//                     // Total items sold
//                     stats.totalItemsSold += quantity;
//
//                     // Top-selling item tracking
//                     const itemName = item.name;
//                     const prevQty = stats.topItemsMap.get(itemName) || 0;
//                     stats.topItemsMap.set(itemName, prevQty + quantity);
//                 }
//             }
//         }
//
//         // Calculate top 5 selling items
//         const topSellingItems = Array.from(stats.topItemsMap.entries())
//             .sort((a, b) => b[1] - a[1])
//             .slice(0, 5)
//             .map(([name, qty]) => ({name, quantity: qty}));
//
//         // Avoid memory issues in response
//
//         // // @ts-ignore
//         // delete stats.topItemsMap;
//
//         // Add average items per order
//         const avgItemsPerOrder = stats.numOfOrders > 0
//             ? parseFloat((stats.totalItemsSold / stats.numOfOrders).toFixed(2))
//             : 0;
//
//         const overviewData = {
//             ...stats,
//             avgItemsPerOrder,
//             topSellingItems,
//         };
//
//         return NextResponse.json({data: overviewData});
//     } catch (err: any) {
//         return NextResponse.json({status: 500, message: err.message});
//     }
// });

export const GET = async (req: Request) => {
    try {
        const ownedRes = await Restaurant.find({ownerId: "0SWp9q5BgfUZ9asZqBRX9cqvejC2"});
        const resIds = ownedRes.map(res => res._id.toString());

        let stats = {
            numOfUnpaidOrders: 0,
            numOfItems: 0,
            numOfOrders: 0,
            numOfPayments: 0,
            numOfMoneyEarned: 0,
            totalItemsSold: 0,
            topItemsMap: new Map<string, number>(), // itemName → quantity
        };

        for (const resId of resIds) {
            // Count basic data
            stats.numOfUnpaidOrders += await TableOrder.countDocuments({isPaid: false, resId});
            stats.numOfPayments += await TableOrder.countDocuments({isPaid: true, resId});
            stats.numOfItems += await Item.countDocuments({resId});
            stats.numOfOrders += await Order.countDocuments({resId});

            // Get completed orders
            const completedOrders = await Order.find({resId, isDone: true}).populate('orderedItems.item');

            for (const order of completedOrders) {
                for (const entry of order.orderedItems) {
                    const item = entry.item;
                    const quantity = entry.quantity || 0;

                    if (!item || !item.price) continue;

                    // Total money
                    stats.numOfMoneyEarned += item.price * quantity;

                    // Total items sold
                    stats.totalItemsSold += quantity;

                    // Top-selling item tracking
                    const itemName = item.name;
                    const prevQty = stats.topItemsMap.get(itemName) || 0;
                    stats.topItemsMap.set(itemName, prevQty + quantity);
                }
            }
        }

        // Calculate top 5 selling items
        const topSellingItems = Array.from(stats.topItemsMap.entries())
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5)
            .map(([name, qty]) => ({name, quantity: qty}));

        // Avoid memory issues in response

        // // @ts-ignore
        // delete stats.topItemsMap;

        // Add average items per order
        const avgItemsPerOrder = stats.numOfOrders > 0
            ? parseFloat((stats.totalItemsSold / stats.numOfOrders).toFixed(2))
            : 0;

        const overviewData = {
            ...stats,
            avgItemsPerOrder,
            topSellingItems,
        };

        return NextResponse.json(overviewData);
    } catch (err: any) {
        return NextResponse.json({status: 500, message: err.message});
    }
}
