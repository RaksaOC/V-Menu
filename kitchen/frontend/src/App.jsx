import './App.css';
import { useEffect, useState, useRef } from "react";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import Card from "./components/Card.jsx";
import axios from "axios";
import {Route, Router, Routes} from "react-router";
import Orders from "./pages/Orders.jsx";
import OrdersHistory from "./pages/OrdersHistory.jsx";

function App() {
    return (
        <>
            <Routes>
                <Route path="/" element={<Orders/>} />
                <Route path="/history" element={<OrdersHistory/>} />
            </Routes>
        </>
    );
}

export default App;
