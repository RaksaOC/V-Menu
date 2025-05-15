import {NextRequest, NextResponse} from "next/server";
import {Table} from "@/app/shared/model/Table";
import {connectToDB} from "@/app/shared/lib/db";
import {withAuthRouteHandler} from "@/app/shared/lib/withAuthRouteHandler";
import {req} from "agent-base";

export const GET = withAuthRouteHandler(async (req: NextRequest, context: any,  user: any) =>{
    try{
        await connectToDB();
        const result = await Table.find({tenantId: user.uid});
        return NextResponse.json(result);
    }catch(err:any){
        return NextResponse.json({message: err.message}, {status: 500});
    }
})