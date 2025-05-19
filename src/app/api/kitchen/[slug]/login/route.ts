// get email, resSlug frpm log in page
// go to tennants collection and find the tenant with that email
// find if one of there resIds are of this restuarant

import {withAuthRouteHandler} from "@/app/shared/lib/withAuthRouteHandler";
import {NextRequest, NextResponse} from "next/server";
import {connectToDB} from "@/app/shared/lib/db";
import {getResIdFromSlug} from "@/app/shared/util/util";
import {Tenant} from "@/app/shared/model/Tenant";

export const GET = async  (req: NextRequest, context: any, user: any) => {
    try {
        await connectToDB();

        const { searchParams } = new URL(req.url);
        const email = searchParams.get('email');
        const resSlug = searchParams.get('resSlug');

        if (!email || !resSlug) {
            return NextResponse.json({ message: "Missing email or resSlug" }, { status: 400 });
        }

        const resId = await getResIdFromSlug(resSlug);
        const result = await Tenant.findOne({ email, resId, role: "chef" });

        if (!result) {
            return NextResponse.json(
                { message: "User does not belong to this restaurant or incorrect role" },
                { status: 401 }
            );
        }

        return NextResponse.json(result);
    } catch (error: any) {
        return NextResponse.json({ message: error.message }, { status: 500 });
    }
};