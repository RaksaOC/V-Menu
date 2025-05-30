// TODO: wrap these in withAuthRouteHandler

import {NextResponse} from "next/server";
import {Restaurant} from "@/app/shared/model/Restaurant";
import {withAuthRouteHandler} from "@/app/shared/lib/withAuthRouteHandler";


// getAllRestaurants
export const GET = withAuthRouteHandler(async (req: Request, context: any, user: any) => {
    try {
        const result = await Restaurant.find({ownerId: user.uid});
        return NextResponse.json(result);
    } catch (err: any) {
        return NextResponse.json({status: 500, message: err.message});
    }
});