import {withAuthRouteHandler} from "@/app/shared/lib/withAuthRouteHandler";
import {NextRequest, NextResponse} from "next/server";
import {Restaurant} from "@/app/shared/model/Restaurant";
import {Tenant} from "@/app/shared/model/Tenant";
import {getTenantEmailFromId, getTenantNameFromId} from "@/app/shared/util/util";

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


// getAllRestaurants
export const GET = withAuthRouteHandler(async (req: Request, context: any, user: any) => {
    try {
        const result = await Restaurant.find({ownerId: user.uid});
        return NextResponse.json(result);
    } catch (err: any) {
        return NextResponse.json({status: 500, message: err.message});
    }
});

export const POST = withAuthRouteHandler(async (req: NextRequest, context: any, user: any) => {
    try {

        // add a new restaurants

        const body = await req.json();
        const {name} = body;
        const newRestaurant = new Restaurant({
            name: name,
            slug: generateRestaurantSlug(name),
            ownerId: user.uid
        })
        const savedRes = await newRestaurant.save();

        // add owner as the three tenants (3 roles)

        const newResId = savedRes._id;
        const tenantName = await getTenantNameFromId(user.uid);
        const tenantEmail = await getTenantEmailFromId(user.uid);

        const asOwner = new Tenant({
                tenantId: user.uid,
                name: tenantName,
                email: tenantEmail,
                role: "owner",
                resId: newResId,
            }
        )

        await asOwner.save();

        const asCashier = new Tenant({
                tenantId: user.uid,
                name: tenantName,
                email: tenantEmail,
                role: "cashier",
                resId: newResId,
            }
        )

        await asCashier.save();

        const asChef = new Tenant({
                tenantId: user.uid,
                name: tenantName,
                email: tenantEmail,
                role: "chef",
                resId: newResId,
            }
        )

        await asChef.save();


        return NextResponse.json(newRestaurant);
    } catch (err: any) {
        return NextResponse.json({status: 400, message: err.message});
    }
})