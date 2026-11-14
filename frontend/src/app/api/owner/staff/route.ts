import {withAuthRouteHandler} from "@/app/shared/lib/withAuthRouteHandler";
import {NextRequest, NextResponse} from "next/server";
import {connectToDB} from "@/app/shared/lib/db";
import {Restaurant} from "@/app/shared/model/Restaurant";
import {Tenant} from "@/app/shared/model/Tenant";
import {getResNameFromId} from "@/app/shared/util/util";

// export const GET = withAuthRouteHandler(async (req: NextRequest, context: any, user: any) => {
//     try {
//         await connectToDB();
//         const restaurants = await Restaurant.find({ownerId: user.uid});
//         const resIds = restaurants.map(r => r._id);
//         let allStaff = [];
//         for (let id of resIds) {
//             const resName = await getResNameFromId(id);
//             const staff = await Tenant.find({resId: id});
//
//             const groupOfStaff = {
//                 resName: resName,
//                 staff: staff,
//             }
//             allStaff.push(groupOfStaff);
//         }
//
//         return NextResponse.json(allStaff);
//
//     } catch (err: any) {
//         return NextResponse.json({message: err.message});
//     }
// });

export const GET = async (req: NextRequest, context: any) => {
    try {
        await connectToDB();

        const userId = '0SWp9q5BgfUZ9asZqBRX9cqvejC2';

        const restaurants = await Restaurant.find({ ownerId: userId });
        const resIds = restaurants.map(r => r._id);

        let allStaff = [];

        for (let id of resIds) {
            const resName = await getResNameFromId(id);
            const staff = await Tenant.find({ resId: id });

            const groupOfStaff = {
                resName,
                staff,
            };

            allStaff.push(groupOfStaff);
        }

        return NextResponse.json(allStaff);
    } catch (err: any) {
        return NextResponse.json({ message: err.message }, { status: 500 });
    }
};

// return like

// [
//     {
//         "resName": "Raksa Restaurant",
//         "staff": [
//             {
//                 "_id": "682ffb55f3b75bda48192a83",
//                 "name": "Ory Chanraksa",
//                 "tenantId": "0SWp9q5BgfUZ9asZqBRX9cqvejC2",
//                 "email": "ocraksa@gmail.com",
//                 "role": "owner",
//                 "resId": "682ffb55f3b75bda48192a81",
//                 "createdAt": "2025-05-23T04:36:37.402Z",
//                 "updatedAt": "2025-05-23T04:36:37.402Z",
//                 "__v": 0
//             },
//             {
//                 "_id": "682ffb55f3b75bda48192a84",
//                 "name": "Ory Chanraksa",
//                 "tenantId": "0SWp9q5BgfUZ9asZqBRX9cqvejC2",
//                 "email": "ocraksa@gmail.com",
//                 "role": "cashier",
//                 "resId": "682ffb55f3b75bda48192a81",
//                 "createdAt": "2025-05-23T04:36:37.460Z",
//                 "updatedAt": "2025-05-23T04:36:37.460Z",
//                 "__v": 0
//             },
//             {
//                 "_id": "682ffb55f3b75bda48192a85",
//                 "name": "Ory Chanraksa",
//                 "tenantId": "0SWp9q5BgfUZ9asZqBRX9cqvejC2",
//                 "email": "ocraksa@gmail.com",
//                 "role": "chef",
//                 "resId": "682ffb55f3b75bda48192a81",
//                 "createdAt": "2025-05-23T04:36:37.516Z",
//                 "updatedAt": "2025-05-23T04:36:37.516Z",
//                 "__v": 0
//             },
//             {
//                 "_id": "683870f584adf85574894254",
//                 "name": "Sao Visal",
//                 "tenantId": "9QxcZnO9IRUMxilaigomCUCf1Zs2",
//                 "email": "saovisal3@gmail.com",
//                 "role": "cashier",
//                 "resId": "682ffb55f3b75bda48192a81",
//                 "createdAt": "2025-05-29T14:36:37.272Z",
//                 "updatedAt": "2025-05-29T14:36:37.272Z",
//                 "__v": 0
//             }
//         ]
//     },
//     {
//         "resName": "Mee Keav",
//         "staff": [
//             {
//                 "_id": "68394a04e6739a042928eba8",
//                 "name": "Ory Chanraksa",
//                 "tenantId": "0SWp9q5BgfUZ9asZqBRX9cqvejC2",
//                 "email": "ocraksa@gmail.com",
//                 "role": "owner",
//                 "resId": "68394a04e6739a042928eba4",
//                 "createdAt": "2025-05-30T06:02:44.339Z",
//                 "updatedAt": "2025-05-30T06:02:44.339Z",
//                 "__v": 0
//             },
//             {
//                 "_id": "68394a04e6739a042928ebaa",
//                 "name": "Ory Chanraksa",
//                 "tenantId": "0SWp9q5BgfUZ9asZqBRX9cqvejC2",
//                 "email": "ocraksa@gmail.com",
//                 "role": "cashier",
//                 "resId": "68394a04e6739a042928eba4",
//                 "createdAt": "2025-05-30T06:02:44.388Z",
//                 "updatedAt": "2025-05-30T06:02:44.388Z",
//                 "__v": 0
//             },
//             {
//                 "_id": "68394a04e6739a042928ebac",
//                 "name": "Ory Chanraksa",
//                 "tenantId": "0SWp9q5BgfUZ9asZqBRX9cqvejC2",
//                 "email": "ocraksa@gmail.com",
//                 "role": "chef",
//                 "resId": "68394a04e6739a042928eba4",
//                 "createdAt": "2025-05-30T06:02:44.452Z",
//                 "updatedAt": "2025-05-30T06:02:44.452Z",
//                 "__v": 0
//             }
//         ]
//     }
// ]
