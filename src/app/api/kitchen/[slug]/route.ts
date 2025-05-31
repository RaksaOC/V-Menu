import {fetchOrders} from "@/app/api/kitchen/[slug]/service";
import {NextRequest, NextResponse} from "next/server";
import {withAuthRouteHandler} from "@/app/shared/lib/withAuthRouteHandler";


export const GET = withAuthRouteHandler(async (req: NextRequest, context: any, user: any) => {
    const slug = context.params.slug;
    console.log("slug is", slug);
    try {
        const result = await fetchOrders(slug);
        return NextResponse.json(result);
    } catch (err) {
        return NextResponse.json({error: 'Something went wrong'}, {status: 500})
    }
});

