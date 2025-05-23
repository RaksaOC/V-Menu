'use client';

import {useState} from 'react';
import {ResSelect} from './modals/ResSelect';
import {Login, LoginDetails} from './modals/Login';
import {RoleSelect} from "@/app/login/modals/RoleSelect";
import {AnimatePresence, motion} from "framer-motion";
import {ArrowLeft} from "lucide-react";
import {ToastContainer} from "react-toastify";
import api from "@/app/shared/lib/axios";
import {useRouter} from "next/navigation";

export default function LoginPage() {
    const router = useRouter();
    const [step, setStep] = useState<"login" | "restaurant" | "role">("login");
    const [restaurants, setRestaurants] = useState<Record<string, string[]>>({});
    const [selectedRes, setSelectedRes] = useState<string | null>(null);
    const [logInDetail, setLogInDetail] = useState<LoginDetails>({
        email: "",
        uid: ""
    });

    const handleLoginSuccess = (logInDetail: LoginDetails, data: Record<string, string[]>) => {
        setRestaurants(data);
        setStep("restaurant");
        setLogInDetail(logInDetail);
    };

    const handleRestaurantSelect = (slug: string) => {
        setSelectedRes(slug);
        setStep("role");
    };

    const handleBack = () => {
        if (step === "restaurant") {
            setStep("login");
        } else if (step === "role") {
            setStep("restaurant");
            setSelectedRes(null);
        }
    };

    const handleRoleSelect = async (role: string) => {
        try {
            let realRole = role;
            if (role === 'chef') realRole = 'kitchen';
            const {email, uid} = logInDetail;
            if (selectedRes) {
                const response = await api.post(`/api/${realRole}/login`, {
                    email: email.toLowerCase(),
                    uid: uid,
                    resSlug: selectedRes.split(' - ')[1], // get the slug
                });
                localStorage.setItem("token", response.data.appToken);
                router.push(`/${selectedRes.split(' - ')[1]}/${realRole}`);
            }
        } catch (error: any) {
            console.error(error);
        }

    }

    return (
        <>
            <div
                className="min-h-screen flex items-center justify-center bg-gradient-to-tr from-blue-950 to-slate-900 text-white px-4 relative">
                <ToastContainer/>
                <div className={"models flex flex-col justify-center items-center max-w-[1024px] w-full py-4"}>
                    {step !== "login" && (
                        <button
                            onClick={handleBack}
                            className="flex items-center self-start gap-2 text-white hover:text-blue-400 transition-colors pl-4 "
                        >
                            <ArrowLeft className="w-5 h-5"/> Back
                        </button>
                    )}
                    <AnimatePresence mode="wait">
                        {step === "login" && (
                            <motion.div
                                key="login"
                                initial={{opacity: 0, x: 100}}
                                animate={{opacity: 1, x: 0}}
                                exit={{opacity: 0, x: -100}}
                                transition={{duration: 0.3}}
                                className="flex justify-center items-center w-full"
                            >
                                <Login onSuccess={handleLoginSuccess}/>
                            </motion.div>
                        )}

                        {step === "restaurant" && (
                            <motion.div
                                key="restaurant"
                                initial={{opacity: 0, x: 100}}
                                animate={{opacity: 1, x: 0}}
                                exit={{opacity: 0, x: -100}}
                                transition={{duration: 0.3}}
                                className=" flex justify-center items-center w-full"
                            >
                                <ResSelect
                                    restaurantNames={Object.keys(restaurants)}
                                    onSelected={handleRestaurantSelect}
                                />
                            </motion.div>
                        )}

                        {step === "role" && selectedRes && (
                            <motion.div
                                key="role"
                                initial={{opacity: 0, x: 100}}
                                animate={{opacity: 1, x: 0}}
                                exit={{opacity: 0, x: -100}}
                                transition={{duration: 0.3}}
                                className="flex justify-center items-center w-full"
                            >
                                <RoleSelect roles={restaurants[selectedRes]} onRoleSelect={handleRoleSelect}/>
                            </motion.div>
                        )}

                    </AnimatePresence>
                </div>
            </div>
        </>
    );
}
