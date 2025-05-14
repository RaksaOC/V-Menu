import {NextRequest, NextResponse} from "next/server";
import {markAsDone} from "@/app/api/kitchen/[id]/service";

export async function PATCH(req: NextRequest, {params}: { params: { id: string } }) {
    try {
        const id = params.id;
        const result = await markAsDone(id);
        return NextResponse.json(result);
    } catch (err) {
        return NextResponse.json({error: 'Something went wrong'}, {status: 500})
    }
}