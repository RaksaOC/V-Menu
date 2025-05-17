import {Tenant} from "@/app/shared/model/Tenant";
import {Restaurant} from "@/app/shared/model/Restaurant";
import {NextRequest, NextResponse} from "next/server";
import {connectToDB} from "@/app/shared/lib/db";

function slugify(name: string): string {
    return name
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-');
}


function generateRestaurantSlug(name: string): string {
    const shortId = Math.random().toString(36).substring(2, 8); // 6-char random ID
    return `${slugify(name)}-${shortId}`;
}

export async function POST(req: NextRequest) {
    await connectToDB();
    const body = await req.json();
    const {ownerName, resName, email, tenantId} = body;
    try {
        const newRestaurant = new Restaurant({
            name: resName,
            slug: generateRestaurantSlug(resName),
            ownerId: tenantId,
        });

        const savedRes = await newRestaurant.save();
        const _id = savedRes._id;


        const tenantAsOwner = new Tenant({
            name: ownerName,
            tenantId: tenantId,
            email: email,
            role: "owner",
            resId: _id,// restaurant link
        });

        const tenantAsCashier = new Tenant({
            name: ownerName,
            tenantId: tenantId,
            email: email,
            role: "cashier",
            resId: _id,// restaurant link
        });

        const tenantAsChef = new Tenant({
            name: ownerName,
            tenantId: tenantId,
            email: email,
            role: "chef",
            resId: _id,// restaurant link
        });

        await tenantAsOwner.save();
        await tenantAsCashier.save();
        await tenantAsChef.save();

        return NextResponse.json({message: "All has been saved", status: 200});
    } catch (error: any) {
        console.error(error);
        return NextResponse.json({message: "Error", status: 400});
    }
}