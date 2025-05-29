import {withAuthRouteHandler} from "@/app/shared/lib/withAuthRouteHandler";
import {NextRequest, NextResponse} from "next/server";
import {connectToDB} from "@/app/shared/lib/db";
import {Tenant} from "@/app/shared/model/Tenant";

export const PUT = withAuthRouteHandler(async (req: NextRequest, context: any, user: any) => {
    // TODO: consider logic of changing email (and password)
    const body = await req.json();
    const params = context.params;
    const id = params.id;
    const {name, email, role} = body;
    await connectToDB();
    try {
        const result = await Tenant.findByIdAndUpdate(id, {name: name, email: email, role: role})
        return NextResponse.json(result);
    } catch (err) {
        console.log(err);
        return NextResponse.json(err);
    }
})

export const DELETE = withAuthRouteHandler(async (req: NextRequest, context: any, user: any) => {

    // TODO: delete the user from firebase too

    const params = context.params;
    const id = params.id;
    await connectToDB();
    try {
        const result = await Tenant.findByIdAndDelete(id);
        return NextResponse.json(result);
    } catch (err) {
        console.log(err);
        return NextResponse.json(err);
    }
})