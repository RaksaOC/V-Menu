import {OrderInput} from "@/app/shared/types/Order";
import {Order as OrderModel} from "@/app/shared/model/Order";
import {Item} from "@/app/shared/model/Item";
import {connectToDB} from "@/app/shared/lib/db";

export async function fetchItems(){
    await connectToDB();
    const data = await Item.find();
    return data
}

export async function placeOrder(order: OrderInput){
    console.log("recieved order in service.ts", order);
    await connectToDB();
    const savedOrder = new OrderModel(order);
    console.log("new model is", savedOrder);
    const result = await savedOrder.save();
    return result;
}