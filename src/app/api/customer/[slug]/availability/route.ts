import {NextRequest, NextResponse} from "next/server";
import {Table} from "@/app/shared/model/Table";
import {getResIdFromSlug} from "@/app/shared/util/util";

export const POST = async (req: NextRequest, {params}: { params: { slug: string } }) => {
    try {
        const body = await req.json();
        console.log("recieved", body);
        const slug = params.slug;
        const {table} = body;
        const resId = await getResIdFromSlug(slug);
        console.log(table);
        console.log(resId);

        const isEnabled = await Table.findOne({name: table.toString(), resId: resId.toString(), isEnabled: true});
        console.log("found", isEnabled);
        if (!isEnabled) {
            return NextResponse.json({message: "Table is not available"}, {status: 401})
        }
        return NextResponse.json({message: "Table is available"}, {status: 200})
    } catch (e) {
        console.log(e);
        return NextResponse.json({message: "Error at checking table status"}, {status: 400})
    }
}