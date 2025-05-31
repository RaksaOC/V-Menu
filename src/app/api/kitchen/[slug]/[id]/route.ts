import {NextRequest, NextResponse} from "next/server";
import {markAsDone} from "@/app/api/kitchen/[slug]/[id]/service";
import {withAuthRouteHandler} from "@/app/shared/lib/withAuthRouteHandler";

export const PATCH = withAuthRouteHandler(async (req: NextRequest, context: any, user: any) => {
    try {
        const id = context.params.id;
        const result = await markAsDone(id);
        return NextResponse.json(result);
    } catch (err) {
        return NextResponse.json({error: 'Something went wrong'}, {status: 500})
    }
});