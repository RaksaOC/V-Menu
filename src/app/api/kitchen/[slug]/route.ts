import {fetchOrders} from "@/app/api/kitchen/[slug]/service";
import {NextRequest, NextResponse} from "next/server";


export async function GET(req: NextRequest, {params}: { params: { slug: string } }) {
    const slug = params.slug;
    console.log("slug is", slug);
    try {
        const result = await fetchOrders(slug);
        return NextResponse.json(result);
    } catch (err) {
        return NextResponse.json({error: 'Something went wrong'}, {status: 500})
    }
}

