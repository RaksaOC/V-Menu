import {NextResponse} from "next/server";
import {TableOrder} from "@/app/shared/model/TableOrder";
import {connectToDB} from "@/app/shared/lib/db";

export async function GET(){
    try{
        await connectToDB();
        const result = await TableOrder.find().populate("orders").exec();
        return NextResponse.json(result);
    }catch(err:any){
        return NextResponse.json({message: err.message}, {status: 500});
    }
}