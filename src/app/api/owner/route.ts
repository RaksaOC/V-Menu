// TODO: wrap these in withAuthRouteHandler

import {NextResponse} from "next/server";
import {Restaurant} from "@/app/shared/model/Restaurant";
import {withAuthRouteHandler} from "@/app/shared/lib/withAuthRouteHandler";


// getAllRestaurants
export const GET = withAuthRouteHandler(async (req: Request, context: any, user: any) => {
    try {
        // TODO: change this ownerId value when have authentication
        const result = await Restaurant.find({"ownerId": "0SWp9q5BgfUZ9asZqBRX9cqvejC2"});
        return NextResponse.json(result);
    } catch (err: any) {
        return NextResponse.json({status: 500, message: err.message});
    }
});