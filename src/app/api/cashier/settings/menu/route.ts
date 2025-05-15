import { NextRequest, NextResponse } from "next/server";
import { Item } from "@/app/shared/model/Item";
import { connectToDB } from "@/app/shared/lib/db";
import { withAuthRouteHandler } from "@/app/shared/lib/withAuthRouteHandler";

// Unprotected handler logic, but gets wrapped
async function getHandler(req: Request, context: any, user: any) {
    try {
        await connectToDB();
        console.log("tenant id to find", user.user_id)
        const result = await Item.find({tenantId: user.uid});
        return NextResponse.json(result);
    } catch (err: any) {
        return NextResponse.json({ message: err.message }, { status: 500 });
    }
}

async function postHandler(req: Request) {
    try {
        const body = await req.json();

        if (!body) {
            return NextResponse.json({ message: "Did not receive body" }, { status: 400 });
        }

        const newItem = new Item(body);
        await newItem.save();

        return NextResponse.json(newItem);
    } catch (err: any) {
        return NextResponse.json({ message: err.message }, { status: 500 });
    }
}

// 👇 Export wrapped handlers
export const GET = withAuthRouteHandler(getHandler);
export const POST = withAuthRouteHandler(postHandler);
