require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const orderRoutes = require('./routes/table-order.routes');
const itemRoutes = require('./routes/item.routes');
const tableRoutes = require('./routes/table.routes');

const app = express();

app.use(express.json());
app.use(express.urlencoded({extended: false}));
app.use(express.static('public'));
app.use(cors(
    {
        allowedHeaders: ['Authorization', 'Content-Type']
    }
));

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

app.use("/api/items", itemRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/tables", tableRoutes)


module.exports = app;