import {NextRequest, NextResponse} from "next/server";
import {Table} from "@/app/shared/model/Table";
import {connectToDB} from "@/app/shared/lib/db";
import {TableInput} from "@/app/shared/types/Table";


export async function GET() {
    try {
        await connectToDB();
        const result = await Table.find();
        return NextResponse.json(result);
    } catch (err: any) {
        return NextResponse.json({message: err.message}, {status: 500});
    }
}

export async function POST(req: NextRequest) {
    try {
        const body: TableInput = await req.json();
        if (!body) {
            return NextResponse.json({message: "Did not recieve body", status: 400});
        }

        if (body.type === "manual") {
            const isTaken = await Table.exists({name: body.name});
            if (isTaken) return NextResponse.json({message: "Name is taken", status: 400});

            const newTable = new Table({name: body.name, isEnabled: false});
            return NextResponse.json(await newTable.save());
        } else {
            const allTables = await Table.find();
            let nextId;
            if (allTables.length === 0) {
                nextId = 1
                const newTable = new Table({name: nextId.toString(), isEnabled: false});
                return NextResponse.json(await newTable.save());
            }
            const numericIds = allTables.map(t => parseInt(t.name)).filter(id => !isNaN(id));
            nextId = numericIds.length > 0 ? Math.max(...numericIds) + 1 : 1;
            console.log("nextId is", nextId);

            const newTable = new Table({name: nextId.toString(), isEnabled: false});
            return NextResponse.json(await newTable.save());
        }
    } catch (err: any) {
        return NextResponse.json({message: err.message, status: 500});
    }
}