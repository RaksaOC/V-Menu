import './App.css';
import Items from './pages/Items';
import Cart from './pages/Cart';
import { Routes, Route } from 'react-router';
import { ToastContainer } from 'react-toastify';
import axios from 'axios';
import { useEffect, useState } from 'react';

function App() {
    const pathParts = window.location.pathname.split("/");
    const tableId = pathParts[pathParts.length - 1];
    localStorage.setItem("tableId", tableId);

    const [isValidTable, setIsValidTable] = useState(null); // null = loading

    useEffect(() => {
        const checkTable = async () => {
            try {
                const res = await axios.get(`http://localhost:3000/tables/${tableId}`);
                setIsValidTable(res.status === 200);
            } catch (err) {
                console.log(err);
                setIsValidTable(false);
            }
        };

        checkTable();
    }, [tableId]);

    return (
        <>
            {isValidTable === null && (
                <div className="h-screen flex flex-col items-center justify-center text-center bg-white text-gray-700">
                    <h2 className="text-2xl font-semibold mb-2 animate-pulse">Loading...</h2>
                    <p className="text-sm">Checking table status, please wait.</p>
                </div>
            )}

            {isValidTable === false && (
                <div className="h-screen flex flex-col items-center justify-center text-center bg-red-50 text-red-700">
                    <h2 className="text-2xl font-bold mb-2">Access Denied</h2>
                    <p className="text-sm">This table is not activated. Please contact restaurant staff.</p>
                </div>
            )}


            {isValidTable && (
                <>
                    <Routes>
                        <Route path={`/items/${tableId}`} element={<Items />} />
                        <Route path="/cart" element={<Cart />} />
                    </Routes>
                    <ToastContainer />
                </>
            )}
        </>
    );
}

export default App;
