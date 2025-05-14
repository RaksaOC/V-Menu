import {NextRequest, NextResponse} from "next/server";
import {Item} from "@/app/shared/model/Item";
import {connectToDB} from "@/app/shared/lib/db";

export async function GET() {
    try {
        await connectToDB();
        const result = await Item.find();
        return NextResponse.json(result);
    } catch (err: any) {
        return NextResponse.json({message: err.message}, {status: 500});
    }
}

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        if (!body) {
            return NextResponse.json({message: "Did not recieve body", status: 400});
        }
        const newItem = new Item(body);

        await newItem.save();
        return NextResponse.json(newItem);
    }catch(err: any){
        return NextResponse.json({message: err.message, status: 500});
    }

}