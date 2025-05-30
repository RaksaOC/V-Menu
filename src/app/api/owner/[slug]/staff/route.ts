import {withAuthRouteHandler} from "@/app/shared/lib/withAuthRouteHandler";
import {NextRequest, NextResponse} from "next/server";
import {Tenant} from "@/app/shared/model/Tenant";
import {getResIdFromSlug} from "@/app/shared/util/util";
import {connectToDB} from "@/app/shared/lib/db";

export const GET = withAuthRouteHandler(async (req: NextRequest, context: any, user: any) => {
    try {
        await connectToDB();
        const id = await getResIdFromSlug(context.params.slug);
        const allStaff = await Tenant.find({resId: id});
        return NextResponse.json(allStaff);
    } catch (err: any) {
        console.log(err);
        return NextResponse.json({status: 500, message: err.message});
    }
})

export const POST = withAuthRouteHandler(async (req: NextRequest, context: any, user: any) => {
    try {
        await connectToDB();
        const body = await req.json();
        const {email, name, password, role, tenantId} = body;
        const id = await getResIdFromSlug(context.params.slug);
        const newStaff = new Tenant({
            tenantId: tenantId,
            resId: id,
            email: email,
            name: name,
            role: role,
            password: password
        })
        await newStaff.save();
        return NextResponse.json(newStaff);
    } catch (err: any) {
        console.log(err);
        return NextResponse.json({status: 500, message: err.message});
    }
})