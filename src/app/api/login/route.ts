import { withAuthRouteHandler } from "@/app/shared/lib/withAuthRouteHandler";
import { NextRequest, NextResponse } from "next/server";
import { connectToDB } from "@/app/shared/lib/db";
import { Tenant } from "@/app/shared/model/Tenant";
import {getResIdFromSlug, getResNameFromId, getResSlugFromId} from "@/app/shared/util/util";
import jwt from "jsonwebtoken";

export const POST = (async (req: NextRequest, context: any, user: any) => {
    try {
        const body = await req.json();
        const email = body.email;
        // const userId = user.uid;
        await connectToDB();

        const tenantDocs = await Tenant.find({ email: email });

        const resMap: { [resName: string]: string[] } = {};

        for (const doc of tenantDocs) {
            let resName = await getResNameFromId(doc.resId);
            const resSlug = await getResSlugFromId(doc.resId);
            resName = resName + " - " + resSlug;
            if (!resMap[resName]) {
                resMap[resName] = [];
            }

            // Avoid duplicate roles for same restaurant
            if (!resMap[resName].includes(doc.role)) {
                resMap[resName].push(doc.role);
            }
        }

        return NextResponse.json(resMap);
    } catch (err: any) {
        console.error(err);
        return NextResponse.json({ message: "Something went wrong" }, { status: 500 });
    }
});
