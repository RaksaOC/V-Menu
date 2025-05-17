import { NextRequest, NextResponse } from "next/server";
import { Item } from "@/app/shared/model/Item";
import { connectToDB } from "@/app/shared/lib/db";
import { withAuthRouteHandler } from "@/app/shared/lib/withAuthRouteHandler";

// 👇 Inline wrapped GET
export const GET = withAuthRouteHandler(async (req: NextRequest, context: any, user: any) => {
    try {
        await connectToDB();
        console.log("tenant id to find", user.uid);
        const result = await Item.find({ resId: user.resId});
        return NextResponse.json(result);
    } catch (err: any) {
        return NextResponse.json({ message: err.message }, { status: 500 });
    }
});

// 👇 Inline wrapped POST
export const POST = withAuthRouteHandler(async (req: NextRequest, context: any, user: any) => {
    try {
        await connectToDB();
        const body = await req.json();

        if (!body) {
            return NextResponse.json({ message: "Did not receive body" }, { status: 400 });
        }

        const newItem = new Item({ ...body, resId: user.resId });
        await newItem.save();

        return NextResponse.json(newItem);
    } catch (err: any) {
        return NextResponse.json({ message: err.message }, { status: 500 });
    }
});
