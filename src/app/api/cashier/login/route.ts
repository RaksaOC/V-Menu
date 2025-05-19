// get email, resSlug frpm log in page
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
        const {email, resSlug} = body;

        if (!email || !resSlug) {
            return NextResponse.json({message: "Missing fields"}, {status: 400});
        }

        const resId = await getResIdFromSlug(resSlug);
        const result = await Tenant.findOne({email, resId, role: "cashier"});

        if (!result) {
            return NextResponse.json(
                {message: "User does not belong to this restaurant or incorrect role"},
                {status: 401}
            );
        }

        // create a jwt token
        const token = jwt.sign(
            {
                email,
                role: "cashier",
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
