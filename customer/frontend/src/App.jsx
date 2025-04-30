import './App.css'
import Items from './pages/Items';
import Cart from './pages/Cart';
import {Routes, Route} from 'react-router'
import {ToastContainer} from "react-toastify";


function App() {
    const pathParts = window.location.pathname.split("/");
    const tableId = pathParts[pathParts.length - 1];
    localStorage.setItem("tableId", tableId);
    return (
        <>
            <Routes>
                <Route path= {`/items/${tableId}`} element={<Items/>}/>
                <Route path="/cart" element={<Cart/>}/>
            </Routes>
            <ToastContainer/>
        </>
    )
}

export default App
