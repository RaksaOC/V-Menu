import './App.css'
import Items from './pages/Items';
import Cart from './pages/Cart';
import {Routes, Route} from 'react-router'
import {ToastContainer} from "react-toastify";


function App() {

    localStorage.clear()
    return (
        <>
            <Routes>
                <Route path="/" element={<Items/>}/>
                <Route path="/cart" element={<Cart/>}/>
            </Routes>
            <ToastContainer
                position="top-center"
                autoClose={1000}
                hideProgressBar
                newestOnTop={true}
                closeOnClick
                rtl={false}
                pauseOnFocusLoss={false}
                draggable={false}
                pauseOnHover={false}
                theme="light"
            />
        </>
    )
}

export default App
