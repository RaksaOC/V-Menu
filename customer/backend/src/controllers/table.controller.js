const express = require("express");
const mongoose = require("mongoose");
const Table = require("../models/Table");

const isTableOpened = async (req, res) => {
    try {
        const table = await Table.findOne({name: req.params.id});
        console.log(req.params.id);
        if (!table || !table.isEnabled) {
            console.log(table);
            console.log(!table.isEnabled);
            return res.status(403).json({message: "TableCard not enabled"});
        }
        return res.status(200).json({message: "TableCard enabled."});
    } catch (err) {
        console.log(err);
        return res.status(400).json({message: "Error occured"});
    }

}


module.exports = {isTableOpened}