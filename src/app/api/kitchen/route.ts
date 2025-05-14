import {fetchOrders} from "@/app/api/kitchen/service";
import {NextRequest, NextResponse} from "next/server";


export async function GET() {
    try {
        const result = await fetchOrders();
        return NextResponse.json(result);
    } catch (err) {
        return NextResponse.json({error: 'Something went wrong'}, {status: 500})
    }
}

