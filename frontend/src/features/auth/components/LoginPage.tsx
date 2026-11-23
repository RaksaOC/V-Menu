'use client';

import {useState} from 'react';
import {ResSelect} from './ResSelect';
import {Login, LoginDetails} from './Login';
import {RoleSelect} from "@/features/auth/components/RoleSelect";
import {AnimatePresence, motion} from "framer-motion";
import {ArrowLeft} from "lucide-react";
import {ToastContainer} from "react-toastify";
import {login, type StaffRole} from "@/features/auth/api";
import {useRouter} from "next/navigation";

export default function LoginPage() {
    const router = useRouter();
    const [step, setStep] = useState<"login" | "restaurants" | "role">("login");
    const [restaurants, setRestaurants] = useState<Record<string, string[]>>({});
    const [selectedRes, setSelectedRes] = useState<string | null>(null);
    const [logInDetail, setLogInDetail] = useState<LoginDetails>({
        email: "",
        idToken: ""
    });

    const handleLoginSuccess = (logInDetail: LoginDetails, data: Record<string, string[]>) => {
        setRestaurants(data);
        setStep("restaurants");
        setLogInDetail(logInDetail);
    };

    const handleRestaurantSelect = (slug: string) => {
        setSelectedRes(slug);
        setStep("role");
    };

    const handleBack = () => {
        if (step === "restaurants") {
            setStep("login");
        } else if (step === "role") {
            setStep("restaurants");
            setSelectedRes(null);
        }
    };

    const handleRoleSelect = async (role: string) => {
        try {
            // "chef" is called "kitchen" in page URLs
            const realRole = role === 'chef' ? 'kitchen' : role;
            const resSlug = selectedRes?.split(' - ')[1];
            const appToken = await login({
                idToken: logInDetail.idToken,
                role: role as StaffRole,
                resSlug: role === 'owner' ? undefined : resSlug,
            });
            localStorage.setItem("token", appToken);
            router.push(role === 'owner' ? `/owner` : `/${resSlug}/${realRole}`);
        } catch (error: any) {
            console.error(error);
        }

    }

    return (
        <>
            <div
                className="min-h-screen flex items-center justify-center bg-[var(--stage)] text-[var(--ink)] px-4 relative">
                <ToastContainer/>
                <div className={"models flex flex-col justify-center items-center max-w-[1024px] w-full py-4"}>
                    <AnimatePresence mode="wait">
                        {step === "login" && (
                            <motion.div
                                key="login"
                                initial={{opacity: 0, x: 100, y: 0}}
                                animate={{opacity: 1, x: 0, y: 0}}
                                exit={{opacity: 0, x: -100, y: 0}}
                                transition={{duration: 0.2}}
                                className="flex justify-center items-center w-full"
                            >
                                <Login onSuccess={handleLoginSuccess}/>
                            </motion.div>
                        )}

                        {step === "restaurants" && (
                            <motion.div
                                key="restaurant"
                                initial={{opacity: 0, x: 100, y: 0}}
                                animate={{opacity: 1, x: 0, y: 0}}
                                exit={{opacity: 0, x: -100, y: 0}}
                                transition={{duration: 0.2}}
                                className=" flex justify-center items-center w-full"
                            >
                                <ResSelect
                                    restaurantNames={Object.keys(restaurants)}
                                    onSelected={handleRestaurantSelect}
                                    onBack={handleBack}
                                />
                            </motion.div>
                        )}

                        {step === "role" && selectedRes && (
                            <motion.div
                                key="role"
                                initial={{opacity: 0, x: 100, y: 0}}
                                animate={{opacity: 1, x: 0, y: 0}}
                                exit={{opacity: 0, x: -100, y: 0}}
                                transition={{duration: 0.2}}
                                className="flex justify-center items-center w-full"
                            >
                                <RoleSelect roles={restaurants[selectedRes]} onRoleSelect={handleRoleSelect}
                                            onBack={handleBack}/>
                            </motion.div>
                        )}

                    </AnimatePresence>
                </div>
            </div>
        </>
    );
}
