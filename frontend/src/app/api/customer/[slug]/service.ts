import {OrderInput} from "@/app/shared/types/Order";
import {Order as OrderModel} from "@/app/shared/model/Order";
import {Item} from "@/app/shared/model/Item";
import {connectToDB} from "@/app/shared/lib/db";
import {TableOrder} from "@/app/shared/model/TableOrder";
import {getResIdFromSlug} from "@/app/shared/util/util";

export async function fetchItems(slug : string){
    await connectToDB();
    const resId = await getResIdFromSlug(slug);
    const data = await Item.find({resId: resId, isEnabled: true});
    return data;
}

export async function placeOrder(order: OrderInput, slug : string){
    await connectToDB();
    const resId = await getResIdFromSlug(slug);
    console.log("resId is ", resId);
    order.resId = resId;
    const savedOrder = new OrderModel(order);

    console.log("saved to order collection", savedOrder);

    const existingTableOrder = await TableOrder.findOne({
        table: order.table,
        isPayed: false,
        resId: resId
    });

    if (existingTableOrder) {
        // 3. Append the new order's _id to the orders array
        existingTableOrder.orders.push(savedOrder._id);
        await existingTableOrder.save();
        console.log("Updated existing TableOrder");
    } else {
        // 4. If no such TableOrder exists, create a new one
        const newTableOrder = new TableOrder({
            table: order.table,
            orders: [savedOrder._id],
            isPayed: false,
            resId: resId
        });

        await newTableOrder.save();
        console.log("Created new TableOrder");
    }

    const result = await savedOrder.save();
    return result;
}