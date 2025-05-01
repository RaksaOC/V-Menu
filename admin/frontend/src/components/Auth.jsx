import { useState } from "react";
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from "firebase/auth";
import { auth } from "../firebase/config.js";
import axios from "axios";

const Auth = () => {
    const [isLogin, setIsLogin] = useState(true);
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");

    const handleAuth = async (e) => {
        e.preventDefault();
        try {
            if (isLogin) {
                const userCred = await signInWithEmailAndPassword(auth, email, password);
                const token = await userCred.user.getIdToken();

                const res = await axios.get("http://localhost:3002/order/protected", {
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                });

                const data = await res.data;
                alert(`Backend says: ${data.message}`);
            } else {
                // create user
                await createUserWithEmailAndPassword(auth, email, password);
                alert("Account created successfully");

                // auto log them in
                const userCred = await signInWithEmailAndPassword(auth, email, password);
                const token = await userCred.user.getIdToken();

                const res = await axios.get("http://localhost:3002/order/protected", {
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                });

                const data = await res.data;
                alert(`Backend says: ${data.message}`);
                // redirect to dashboard page or sth
                setIsLogin(true);
            }
        } catch (err) {
            console.error(err);
            alert(err.message);
        }
    };

    return (
        <form
            onSubmit={handleAuth}
            className="max-w-sm mx-auto mt-32 bg-white dark:bg-zinc-900 p-6 rounded-2xl shadow-lg flex flex-col gap-4"
        >
            <h2 className="text-xl font-semibold text-center text-zinc-800 dark:text-white">
                {isLogin ? "Admin Login" : "Create Account"}
            </h2>

            <input
                type="email"
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Email"
                className="px-4 py-2 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
            />

            <input
                type="password"
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password"
                className="px-4 py-2 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
            />

            <button
                type="submit"
                className="mt-2 bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 rounded-xl transition duration-200"
            >
                {isLogin ? "Login" : "Sign Up"}
            </button>

            <button
                type="button"
                onClick={() => setIsLogin(!isLogin)}
                className="text-sm text-center text-blue-600 hover:underline mt-2"
            >
                {isLogin ? "Don't have an account? Sign up" : "Already have an account? Log in"}
            </button>
        </form>
    );
};

export default Auth;
