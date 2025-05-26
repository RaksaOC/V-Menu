// get email, resSlug frpm log in page.tsx
// go to tennants collection and find the tenant with that email
// find if one of there resIds are of this restuarant

import {withAuthRouteHandler} from "@/app/shared/lib/withAuthRouteHandler";
import {NextRequest, NextResponse} from "next/server";
import {connectToDB} from "@/app/shared/lib/db";
import {getResIdFromSlug} from "@/app/shared/util/util";
import {Tenant} from "@/app/shared/model/Tenant";
import jwt from "jsonwebtoken";

export const POST = async (req: NextRequest, context: any, user: any) => {
    try {
        await connectToDB();

        const body = await req.json();
        const {email, uid} = body;

        if (!email || !uid) {
            return NextResponse.json({message: "Missing fields"}, {status: 400});
        }

        const result = await Tenant.findOne({email: email, tenantId: uid, role: "owner"});

        if (!result) {
            return NextResponse.json(
                {message: "Invalid or incorrect role"},
                {status: 401}
            );
        }

        // create a jwt token
        const token = jwt.sign(
            {
                email: email,
                role: "owner",
                uid: uid,
            },
            "superSecretKey123!@#_change_this_in_production",
            {expiresIn: '1h'}
        );

        const response = NextResponse.json({appToken: token});
        response.cookies.set('token', token, {
            httpOnly: true,
            secure: true,
            path: '/',
            sameSite: 'lax',
        });

        return response;

    } catch (error: any) {
        console.error("Login Error:", error);
        return NextResponse.json({message: error.message}, {status: 500});
    }
};
