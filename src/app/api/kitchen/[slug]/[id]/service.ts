import {connectToDB} from "@/app/shared/lib/db";
import {Order} from "@/app/shared/model/Order";

export async function markAsDone(id: string){
    await connectToDB();
    const result = await Order.findByIdAndUpdate(id,  {isDone: true});
    return result;
}