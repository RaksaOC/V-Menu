import {OrderInput} from "@/app/shared/types/Order";
import {Order as OrderModel} from "@/app/shared/model/Order";
import {Item} from "@/app/shared/model/Item";
import {connectToDB} from "@/app/shared/lib/db";
import {TableOrder} from "@/app/shared/model/TableOrder";

export async function fetchItems(){
    await connectToDB();
    const data = await Item.find();
    return data;
}

export async function placeOrder(order: OrderInput){
    await connectToDB();
    const savedOrder = new OrderModel(order);

    const existingTableOrder = await TableOrder.findOne({
        table: order.table,
        isPayed: false
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
            isPayed: false
        });

        await newTableOrder.save();
        console.log("Created new TableOrder");
    }

    const result = await savedOrder.save();
    return result;
}