import './App.css';
import {ToastContainer} from "react-toastify";
import {Routes, Route} from "react-router";
import Dashboard from "./pages/Dashboard.jsx";
import Authentication from "./pages/Auth.jsx";
import Settings from "./pages/Settings.jsx";
import {OrderHistory} from "./pages/OrderHistory.jsx";

function App() {
    return (
        <>
            <Routes>
                <Route path="/" element={<Authentication />} />
                <Route path="/authentication" element={<Authentication />} />
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/settings" element={<Settings />} />
                <Route path="/orderHistory" element={<OrderHistory/>} />
            </Routes>
            <ToastContainer/>
        </>
    );
}

export default App;
