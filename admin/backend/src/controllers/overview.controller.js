const {getOverview} = require("../services/overview.services");

const overview = async (req, res) => {
    try{
        const data = await getOverview();
        res.status(200).json(data);
    }catch(err){
        console.log(err);
        res.status(400).send({message: err.message});
    }
}

module.exports = {overview};