'use client';

import { useState } from 'react';
import { ResSelect } from './modals/ResSelect';
// import axios from 'axios'; // Uncomment when backend is ready
import { toast } from 'react-toastify';

const dummyRestaurants = [
    {
        id: '1',
        name: 'Joe\'s Diner',
        roles: [
            { label: 'Chef', route: '/vmenu/joes-diner/kitchen' },
            { label: 'Cashier', route: '/vmenu/joes-diner/cashier' },
        ],
    },
    {
        id: '2',
        name: 'Bella Pizza',
        roles: [
            { label: 'Chef', route: '/vmenu/bella-pizza/kitchen' },
        ],
    },
];

export default function LoginPage() {
    const [form, setForm] = useState({ email: '', password: '' });
    const [loading, setLoading] = useState(false);
    const [showModal, setShowModal] = useState(false);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setForm({ ...form, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            // Uncomment for real login:
            // const res = await axios.post('/api/login', form);
            // if (res.status === 200) {
            //   toast.success('Login successful!');
            //   setShowModal(true);
            // }

            // Mock behavior for now:
            setTimeout(() => {
                toast.success('Login successful!');
                setShowModal(true);
                setLoading(false);
            }, 1000);
        } catch (err) {
            toast.error('Login failed. Please check credentials.');
            setLoading(false);
        }
    };

    return (
        <>
            <ResSelect
                isOpen={showModal}
                onClose={() => setShowModal(false)}
                restaurants={dummyRestaurants}
            />

            <div className="min-h-screen flex items-center justify-center bg-gradient-to-tr from-blue-950 to-slate-900 text-white px-4">
                <form
                    onSubmit={handleSubmit}
                    className="bg-white/5 backdrop-blur-md rounded-2xl shadow-2xl p-8 max-w-md w-full space-y-6"
                >
                    <h2 className="text-3xl font-bold text-center mb-4">Login</h2>

                    <div className="space-y-4">
                        <div>
                            <label htmlFor="email" className="block text-sm mb-1">Email</label>
                            <input
                                type="email"
                                name="email"
                                required
                                value={form.email}
                                onChange={handleChange}
                                className="w-full px-4 py-2 rounded-lg bg-white text-black"
                            />
                        </div>

                        <div>
                            <label htmlFor="password" className="block text-sm mb-1">Password</label>
                            <input
                                type="password"
                                name="password"
                                required
                                value={form.password}
                                onChange={handleChange}
                                className="w-full px-4 py-2 rounded-lg bg-white text-black"
                            />
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className={`w-full py-2 rounded-xl font-semibold transition duration-300 ${
                            loading
                                ? 'bg-blue-400 cursor-not-allowed'
                                : 'bg-blue-600 hover:bg-blue-700'
                        }`}
                    >
                        {loading ? 'Logging in...' : 'Login'}
                    </button>
                </form>
            </div>
        </>
    );
}
