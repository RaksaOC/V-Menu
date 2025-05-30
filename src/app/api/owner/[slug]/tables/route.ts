import {NextRequest, NextResponse} from "next/server";
import {Table} from "@/app/shared/model/Table";
import {connectToDB} from "@/app/shared/lib/db";
import {TableInput} from "@/app/shared/types/Table";
import {withAuthRouteHandler} from "@/app/shared/lib/withAuthRouteHandler";
import {getResIdFromSlug} from "@/app/shared/util/util";

export const GET = withAuthRouteHandler(async (req: NextRequest, context: any, user: any) => {
    try {
        await connectToDB();
        const id = await getResIdFromSlug(context.params.slug);
        const result = await Table.find({resId: id});
        return NextResponse.json(result);
    } catch (err: any) {
        return NextResponse.json({message: err.message}, {status: 500});
    }
});

export const POST = withAuthRouteHandler(async (req: NextRequest, context: any, user: any) => {
    try {
        const body: TableInput = await req.json();
        if (!body) {
            return NextResponse.json({message: "Did not receive body"}, {status: 400});
        }
        const id = await getResIdFromSlug(context.params.slug);
        if (body.type === "manual") {

            const isTaken = await Table.exists({name: body.name, resId: id});
            if (isTaken) return NextResponse.json({message: "Name is taken"}, {status: 400});

            const newTable = new Table({name: body.name, isEnabled: false, resId: id});
            return NextResponse.json(await newTable.save());
        } else {
            const allTables = await Table.find({resId: id});
            let nextId;

            if (allTables.length === 0) {
                nextId = 1;
            } else {
                const numericIds = allTables.map(t => parseInt(t.name)).filter(id => !isNaN(id));
                nextId = numericIds.length > 0 ? Math.max(...numericIds) + 1 : 1;
            }

            const newTable = new Table({name: nextId.toString(), isEnabled: false, resId: id});
            return NextResponse.json(await newTable.save());
        }
    } catch (err: any) {
        return NextResponse.json({message: err.message}, {status: 500});
    }
});
