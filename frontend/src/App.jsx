import './App.css'
import Items from './pages/Items';
import Cart from './pages/Cart';
import {Link,  Routes, Route} from 'react-router';



function App() {

    localStorage.clear()
    return (
        <>
            <Routes>
                <Route path="/" element={<Items/>}/>
                <Route path="/cart" element={<Cart/>}/>
            </Routes>
        </>
    )
}

export default App
