import {Restaurant} from "@/app/shared/model/Restaurant";

export const getResFromSlug = async (slug: string) => {
    const res =  await Restaurant.findOne({slug: slug});
    return res.name;
}