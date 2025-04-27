const express = require('express');
const mongoose = require('mongoose');
const app = express();

async function databaseConnection() {
    try {
        await mongoose.connect("mongodb+srv://ocraksa:MyMongo123@cluster0.xdar3x8.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0", {
            useNewUrlParser: true,
            useUnifiedTopology: true,
        });
        console.log('MongoDB connected successfully!');
    } catch (error) {
        console.error('MongoDB connection failed:', error);
    }
}

// Call the function to connect to the database
databaseConnection();

app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(express.static('public'));

app.listen(3000, () => {
    console.log('Server started on port 3000');
});
