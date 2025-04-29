require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const itemRoutes = require('./route/itemRoutes');
const orderRoutes = require('./route/orderRoutes');

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(express.static('public'));
app.use(cors());

const connectionString = process.env.MONGODB_URI;

async function databaseConnection() {
    try {
        await mongoose.connect(connectionString, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
        });
        console.log('MongoDB connected successfully!');
    } catch (error) {
        console.error('MongoDB connection failed:', error);
    }
}

databaseConnection();

app.use("/", itemRoutes);
app.use("/", orderRoutes);

module.exports = app;