import {Order} from "@/app/shared/model/Order";
import {connectToDB} from "@/app/shared/lib/db";

export async function fetchOrders(){
    await connectToDB();
    const result = await Order.find();
    return result;
}

