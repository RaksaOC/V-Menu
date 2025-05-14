import {NextResponse} from "next/server";
import {Item} from "@/app/shared/model/Item";
import {connectToDB} from "@/app/shared/lib/db";

export async function GET(){
    try{
        await connectToDB();
        const result = await Item.find();
        return NextResponse.json(result);
    }catch(err:any){
        return NextResponse.json({message: err.message}, {status: 500});
    }
}