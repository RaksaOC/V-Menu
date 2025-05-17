import {Item} from "@/app/shared/model/Item";
import {Restaurant} from "@/app/shared/model/Restaurant";

export const getResIdFromSlug = async (slug: string) => {
    const res =  await Restaurant.findOne({slug: slug});
    return res._id;
}