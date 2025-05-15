import {NextResponse} from "next/server";
import {Table} from "@/app/shared/model/Table";
import {connectToDB} from "@/app/shared/lib/db";

export async function GET(){
    try{
        await connectToDB();
        const result = await Table.find();
        return NextResponse.json(result);
    }catch(err:any){
        return NextResponse.json({message: err.message}, {status: 500});
    }
}