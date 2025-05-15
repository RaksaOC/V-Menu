import {useState} from "react";
import AddTablePopup from "./AddTablePopup";
import Tables from "./Tables";
import axios from "axios";
import {TableInput} from "@/app/shared/types/Table";

function TablesSection() {
    const [showAddTable, setShowAddTable] = useState(false);

    const handleOnClose = () => {
        setShowAddTable(false);
    }

    const  handleOnSave = async (table: TableInput) => {
        try {
            const response = await axios.post("/api/cashier/settings/tables", table)
            if (response.status === 200) {
                console.log("response", response);
            }
            setShowAddTable(false);
            location.reload();
        } catch (err) {
            console.log(err);
        }
        setShowAddTable(false);
    }

    return (
        <>
            <div className="tables-wrapper max-w-[1024px] w-full flex flex-col items-center justify-center">
                <div className="flex items-center justify-between mb-4 w-full">
                    <h2 className="text-xl font-semibold">Tables</h2>
                    <button
                        className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium py-2 px-4 rounded-xl transition-colors duration-200"
                        onClick={() => {
                            setShowAddTable(!showAddTable);
                        }}
                    >
                        + Add Table
                    </button>
                </div>
                <Tables/>
                {
                    showAddTable && <AddTablePopup onClose={handleOnClose} onSave={handleOnSave}></AddTablePopup>
                }
            </div>
        </>
    );
}

export default TablesSection;