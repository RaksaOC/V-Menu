import MenuCard from "./MenuCard.jsx";
import Dashboard from "../pages/Dashboard.jsx";

const Menu = () => {
    return (
        <div className="menu flex flex-wrap justify-center items-center">
            <MenuCard
                id="1"
                name="Spicy Chicken Wrap"
                price={6.99}
                image="https://source.unsplash.com/400x300/?food"
            /><MenuCard
            id="1"
            name="Spicy Chicken Wrap"
            price={6.99}
            image="https://source.unsplash.com/400x300/?food"
        /><MenuCard
            id="1"
            name="Spicy Chicken Wrap"
            price={6.99}
            image="https://source.unsplash.com/400x300/?food"
        /><MenuCard
            id="1"
            name="Spicy Chicken Wrap"
            price={6.99}
            image="https://source.unsplash.com/400x300/?food"
        /><MenuCard
            id="1"
            name="Spicy Chicken Wrap"
            price={6.99}
            image="https://source.unsplash.com/400x300/?food"
        /><MenuCard
            id="1"
            name="Spicy Chicken Wrap"
            price={6.99}
            image="https://source.unsplash.com/400x300/?food"
        />
        </div>

    )
}

export default Menu;