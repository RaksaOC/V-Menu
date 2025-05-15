import {Tenant} from "@/app/shared/model/Tenant";
import {NextRequest, NextResponse} from "next/server";
import {connectToDB} from "@/app/shared/lib/db";

export async function POST(req: NextRequest) {
    await connectToDB();
    const body = await req.json();
    try {
        const tenant = new Tenant(body);
        await tenant.save();
        return NextResponse.json({message: tenant, status: 200});
    }catch (error: any) {
        console.error(error);
        return NextResponse.json({message: "Error", status: 400});
    }
}