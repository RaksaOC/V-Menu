import {NextRequest, NextResponse} from "next/server";
import {fetchItems, placeOrder} from "@/app/api/customer/[slug]/service";
import {Order, OrderInput} from "@/app/shared/types/Order";

export async function GET(req: NextRequest, {params}: { params: { slug: string } }) {
    const slug = params.slug;

    try {
        const data = await fetchItems(slug);
        return NextResponse.json(data);
    } catch (err) {
        return NextResponse.json({error: 'Something went wrong'}, {status: 500})
    }
}

export async function POST(req: NextRequest, {params}: { params: { slug: string } }) {
    const slug = params.slug;
    console.log("slug is ", slug);
    try {
        const body: OrderInput = await req.json();
        console.log(body);
        const result = await placeOrder(body, slug);
        return NextResponse.json(result);
    } catch (err) {
        return NextResponse.json({message: err});
    }
}