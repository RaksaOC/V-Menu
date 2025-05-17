import {Order} from "@/app/shared/model/Order";
import {connectToDB} from "@/app/shared/lib/db";
import {getResIdFromSlug} from "@/app/shared/util/util";

export async function fetchOrders(slug: string) {
    await connectToDB();
    const resId = await getResIdFromSlug(slug);
    const result = await Order.find({resId: resId});
    return result;
}

