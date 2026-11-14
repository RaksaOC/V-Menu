import {NextRequest, NextResponse} from "next/server";
import {Table} from "@/app/shared/model/Table";
import {connectToDB} from "@/app/shared/lib/db";
import {withAuthRouteHandler} from "@/app/shared/lib/withAuthRouteHandler";
import {req} from "agent-base";
import {getResIdFromSlug} from "@/app/shared/util/util";

export const GET = withAuthRouteHandler(async (req: NextRequest, context: any,  user: any) =>{
    try{
        await connectToDB();
        const id = await getResIdFromSlug(context.params.slug);
        const result = await Table.find({resId: id});
        return NextResponse.json(result);
    }catch(err:any){
        return NextResponse.json({message: err.message}, {status: 500});
    }
})