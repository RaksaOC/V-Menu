import {Item} from "@/app/shared/model/Item";
import {Restaurant} from "@/app/shared/model/Restaurant";
import {Tenant} from "@/app/shared/model/Tenant";
import {connectToDB} from "@/app/shared/lib/db";

export const getResIdFromSlug = async (slug: string) => {
    await connectToDB();
    const res =  await Restaurant.findOne({slug: slug});
    return res._id;
}

export const getResNameFromId = async (id: string) => {
    await connectToDB();
    const res =  await Restaurant.findOne({_id: id});
    return res.name;
}

export const getResSlugFromId = async (id: string) => {
    await connectToDB();
    const res =  await Restaurant.findOne({_id: id});
    return res.slug;
}

export const getTenantNameFromId = async (tenantId: string) => {
    await connectToDB();
    const res =  await Tenant.findOne({tenantId: tenantId});
    return res.name;
}

export const getTenantEmailFromId = async (tenantId: string) => {
    await connectToDB();
    const res =  await Tenant.findOne({tenantId: tenantId});
    return res.email;
}
