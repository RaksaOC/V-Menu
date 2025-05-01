import './App.css';
import {ToastContainer} from "react-toastify";
import {Routes, Route} from "react-router";
import Dashboard from "./pages/Dashboard.jsx";
import Authentication from "./pages/Auth.jsx";

function App() {
    return (
        <>
            <Routes>
                <Route path="/" element={<Authentication />} />
                <Route path="/authentication" element={<Authentication />} />
                <Route path="/dashboard" element={<Dashboard />} />
            </Routes>
            <ToastContainer/>
        </>
    );
}

export default App;
