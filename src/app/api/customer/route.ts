import {NextRequest, NextResponse} from "next/server";
import {fetchItems, placeOrder} from "@/app/api/customer/service";
import {Order, OrderInput} from "@/app/shared/types/Order";

export async function GET() {
    try {
        const data = await fetchItems();
        return NextResponse.json(data);
    } catch (err) {
        return NextResponse.json({error: 'Something went wrong'}, {status: 500})
    }
}

export async function POST(req: NextRequest) {
    try {
        const body: OrderInput = await req.json();
        console.log(body);
        const result = await placeOrder(body);
        return NextResponse.json(result);
    } catch (err) {
        return NextResponse.json({message: err});
    }
}