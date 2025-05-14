(globalThis.TURBOPACK = globalThis.TURBOPACK || []).push([typeof document === "object" ? document.currentScript : undefined, {

"[project]/src/app/[res]/customer/[table]/cart/CartItemCard.tsx [app-client] (ecmascript)": ((__turbopack_context__) => {
"use strict";

var { g: global, __dirname, k: __turbopack_refresh__, m: module } = __turbopack_context__;
{
// components/CartItem.tsx
__turbopack_context__.s({
    "default": (()=>__TURBOPACK__default__export__)
});
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/jsx-dev-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$trash$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Trash$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/trash.js [app-client] (ecmascript) <export default as Trash>");
;
;
const CartItemCard = ({ cartItem, index, increaseQuantity, decreaseQuantity, removeItem })=>{
    // const [menuItem, setMenuItems] = useState<Item>(item.item);
    const menuItem = cartItem.item;
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        className: "bg-white rounded-xl shadow-md flex items-center p-4 gap-4 flex-wrap justify-center md:justify-between",
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("img", {
                src: menuItem.image,
                alt: menuItem.name,
                className: "w-20 h-20 object-cover rounded-lg"
            }, void 0, false, {
                fileName: "[project]/src/app/[res]/customer/[table]/cart/CartItemCard.tsx",
                lineNumber: 23,
                columnNumber: 13
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "flex-1 min-w-1/4",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h2", {
                        className: "font-semibold text-s",
                        children: menuItem.name
                    }, void 0, false, {
                        fileName: "[project]/src/app/[res]/customer/[table]/cart/CartItemCard.tsx",
                        lineNumber: 29,
                        columnNumber: 17
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                        className: "text-gray-600",
                        children: [
                            "$",
                            Number(menuItem.price * cartItem.quantity).toFixed(2)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/src/app/[res]/customer/[table]/cart/CartItemCard.tsx",
                        lineNumber: 30,
                        columnNumber: 17
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/src/app/[res]/customer/[table]/cart/CartItemCard.tsx",
                lineNumber: 28,
                columnNumber: 13
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "flex items-center gap-0.5",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                        onClick: ()=>decreaseQuantity(index),
                        className: "bg-gray-300 hover:bg-gray-400 text-black text-sm font-bold w-8 h-8 rounded-full flex items-center justify-center",
                        children: "-"
                    }, void 0, false, {
                        fileName: "[project]/src/app/[res]/customer/[table]/cart/CartItemCard.tsx",
                        lineNumber: 35,
                        columnNumber: 17
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                        className: "font-semibold text-base w-6 text-center",
                        children: cartItem.quantity
                    }, void 0, false, {
                        fileName: "[project]/src/app/[res]/customer/[table]/cart/CartItemCard.tsx",
                        lineNumber: 42,
                        columnNumber: 17
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                        onClick: ()=>increaseQuantity(index),
                        className: "bg-gray-300 hover:bg-gray-400 text-black text-sm font-bold w-8 h-8 rounded-full flex items-center justify-center",
                        children: "+"
                    }, void 0, false, {
                        fileName: "[project]/src/app/[res]/customer/[table]/cart/CartItemCard.tsx",
                        lineNumber: 46,
                        columnNumber: 17
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                        onClick: ()=>removeItem(index),
                        className: "ml-2 w-6 h-6 flex items-center justify-center cursor-pointer",
                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$trash$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Trash$3e$__["Trash"], {
                            size: 20,
                            color: "red"
                        }, void 0, false, {
                            fileName: "[project]/src/app/[res]/customer/[table]/cart/CartItemCard.tsx",
                            lineNumber: 57,
                            columnNumber: 21
                        }, this)
                    }, void 0, false, {
                        fileName: "[project]/src/app/[res]/customer/[table]/cart/CartItemCard.tsx",
                        lineNumber: 53,
                        columnNumber: 17
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/src/app/[res]/customer/[table]/cart/CartItemCard.tsx",
                lineNumber: 34,
                columnNumber: 13
            }, this)
        ]
    }, index, true, {
        fileName: "[project]/src/app/[res]/customer/[table]/cart/CartItemCard.tsx",
        lineNumber: 19,
        columnNumber: 9
    }, this);
};
_c = CartItemCard;
const __TURBOPACK__default__export__ = CartItemCard;
var _c;
__turbopack_context__.k.register(_c, "CartItemCard");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(module, globalThis.$RefreshHelpers$);
}
}}),
"[project]/src/app/[res]/customer/[table]/cart/page.tsx [app-client] (ecmascript)": ((__turbopack_context__) => {
"use strict";

var { g: global, __dirname, k: __turbopack_refresh__, m: module } = __turbopack_context__;
{
__turbopack_context__.s({
    "default": (()=>CartPage)
});
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/jsx-dev-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/index.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2d$toastify$2f$dist$2f$index$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/react-toastify/dist/index.mjs [app-client] (ecmascript)"); // ✅ fixed import
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$axios$2f$lib$2f$axios$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/axios/lib/axios.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$app$2f5b$res$5d2f$customer$2f5b$table$5d2f$cart$2f$CartItemCard$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/app/[res]/customer/[table]/cart/CartItemCard.tsx [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$navigation$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/navigation.js [app-client] (ecmascript)");
;
var _s = __turbopack_context__.k.signature();
'use client';
;
;
;
;
;
function CartPage() {
    _s();
    const router = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$navigation$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useRouter"])();
    const [cartItems, setCartItems] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])([]);
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "CartPage.useEffect": ()=>{
            const savedCart = localStorage.getItem("cartItems");
            if (savedCart) {
                setCartItems(JSON.parse(savedCart));
            }
        }
    }["CartPage.useEffect"], []);
    const updateCart = (updatedItems)=>{
        setCartItems(updatedItems);
        localStorage.setItem("cartItems", JSON.stringify(updatedItems));
    };
    const increaseQuantity = (index)=>{
        const updatedItems = [
            ...cartItems
        ];
        updatedItems[index].quantity += 1;
        updateCart(updatedItems);
    };
    const decreaseQuantity = (index)=>{
        const updatedItems = [
            ...cartItems
        ];
        if (updatedItems[index].quantity > 1) {
            updatedItems[index].quantity -= 1;
            updateCart(updatedItems);
        }
    };
    const removeItem = (index)=>{
        const updatedItems = [
            ...cartItems
        ];
        updatedItems.splice(index, 1);
        updateCart(updatedItems);
    };
    const total = cartItems.reduce((sum, item)=>sum + item.item.price * item.quantity, 0);
    const placeOrder = async ()=>{
        if (!cartItems.length) {
            __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2d$toastify$2f$dist$2f$index$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["toast"].error("No items in cart!", {
                position: "top-center",
                autoClose: 1000,
                hideProgressBar: true,
                closeOnClick: true,
                pauseOnHover: false,
                draggable: false,
                theme: "light"
            });
            return;
        }
        try {
            const table = JSON.parse(localStorage.getItem("table") || "") || "";
            const orderToAdd = {
                table: table,
                isDone: false,
                orderedItems: cartItems
            };
            await __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$axios$2f$lib$2f$axios$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"].post("/api/customer", orderToAdd);
            __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2d$toastify$2f$dist$2f$index$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["toast"].success("Order has been placed!", {
                position: "top-center",
                autoClose: 1000,
                hideProgressBar: true,
                closeOnClick: true,
                pauseOnHover: false,
                draggable: false,
                theme: "light"
            });
            setTimeout(()=>{
                setCartItems([]);
                localStorage.removeItem("cartItems");
                router.back();
            }, 1000);
        } catch (error) {
            console.error("Order failed:", error);
            __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2d$toastify$2f$dist$2f$index$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["toast"].error("Failed to place order.", {
                position: "top-center",
                autoClose: 1000,
                theme: "light"
            });
        }
    };
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        className: "relative min-h-screen p-4 pb-32 bg-gray-100 flex flex-col justify-start items-center",
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "header-wrapper w-full",
                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    className: "header justify-between flex flex-row w-full items-center md:max-w-[50%]",
                    children: [
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                            onClick: ()=>router.back(),
                            className: "bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-6 rounded-xl h-[40px]",
                            children: "Go Back"
                        }, void 0, false, {
                            fileName: "[project]/src/app/[res]/customer/[table]/cart/page.tsx",
                            lineNumber: 102,
                            columnNumber: 21
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h1", {
                            className: "text-2xl font-bold text-center mb-0",
                            children: "Your Cart"
                        }, void 0, false, {
                            fileName: "[project]/src/app/[res]/customer/[table]/cart/page.tsx",
                            lineNumber: 108,
                            columnNumber: 21
                        }, this)
                    ]
                }, void 0, true, {
                    fileName: "[project]/src/app/[res]/customer/[table]/cart/page.tsx",
                    lineNumber: 101,
                    columnNumber: 17
                }, this)
            }, void 0, false, {
                fileName: "[project]/src/app/[res]/customer/[table]/cart/page.tsx",
                lineNumber: 100,
                columnNumber: 13
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "flex flex-col gap-4 w-[98%] mt-14",
                children: cartItems.length > 0 ? cartItems.map((cartItem, index)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$app$2f5b$res$5d2f$customer$2f5b$table$5d2f$cart$2f$CartItemCard$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"], {
                        cartItem: cartItem,
                        index: index,
                        increaseQuantity: increaseQuantity,
                        decreaseQuantity: decreaseQuantity,
                        removeItem: removeItem
                    }, index, false, {
                        fileName: "[project]/src/app/[res]/customer/[table]/cart/page.tsx",
                        lineNumber: 115,
                        columnNumber: 25
                    }, this)) : /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h1", {
                    className: "mt-[40vh] text-4xl text-center",
                    children: "Cart is Empty"
                }, void 0, false, {
                    fileName: "[project]/src/app/[res]/customer/[table]/cart/page.tsx",
                    lineNumber: 125,
                    columnNumber: 21
                }, this)
            }, void 0, false, {
                fileName: "[project]/src/app/[res]/customer/[table]/cart/page.tsx",
                lineNumber: 112,
                columnNumber: 13
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "fixed bottom-0 left-0 w-full bg-white border-t border-gray-300 flex items-center justify-between p-4",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "text-lg font-bold",
                        children: [
                            "Total: $",
                            total.toFixed(2)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/src/app/[res]/customer/[table]/cart/page.tsx",
                        lineNumber: 132,
                        columnNumber: 17
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                        onClick: placeOrder,
                        className: "bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-6 rounded-xl",
                        children: "Place Order"
                    }, void 0, false, {
                        fileName: "[project]/src/app/[res]/customer/[table]/cart/page.tsx",
                        lineNumber: 135,
                        columnNumber: 17
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/src/app/[res]/customer/[table]/cart/page.tsx",
                lineNumber: 130,
                columnNumber: 13
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2d$toastify$2f$dist$2f$index$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["ToastContainer"], {}, void 0, false, {
                fileName: "[project]/src/app/[res]/customer/[table]/cart/page.tsx",
                lineNumber: 142,
                columnNumber: 13
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/src/app/[res]/customer/[table]/cart/page.tsx",
        lineNumber: 99,
        columnNumber: 9
    }, this);
}
_s(CartPage, "hMkNHcAbGynVKFvbiOzMsm075zw=", false, function() {
    return [
        __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$navigation$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useRouter"]
    ];
});
_c = CartPage;
var _c;
__turbopack_context__.k.register(_c, "CartPage");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(module, globalThis.$RefreshHelpers$);
}
}}),
}]);

//# sourceMappingURL=src_app_%5Bres%5D_customer_%5Btable%5D_cart_f210ced8._.js.map