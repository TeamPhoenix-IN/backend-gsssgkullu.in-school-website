const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

// MongoDB Connection
mongoose.connect(process.env.MONGODB_URI)
    .then(() => console.log('Connected to MongoDB Atlas'))
    .catch(err => console.error('MongoDB connection error:', err));

// Database Schema
const submissionSchema = new mongoose.Schema({
    student_name: String,
    aadhar: String,
    full_data: String,
    timestamp: { type: Date, default: Date.now }
});

const Submission = mongoose.model('Submission', submissionSchema);

// API Routes
app.post('/api/submit', async (req, res) => {
    try {
        const formData = req.body;
        const newSubmission = new Submission({
            student_name: formData.studentName || formData.name || 'Unknown',
            aadhar: formData.aadhar || 'N/A',
            full_data: JSON.stringify(formData)
        });
        
        const savedSubmission = await newSubmission.save();
        res.status(200).json({ success: true, id: savedSubmission._id });
    } catch (err) {
        console.error("Database error:", err.message);
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/submissions', async (req, res) => {
    try {
        const submissions = await Submission.find().sort({ timestamp: -1 });
        res.status(200).json(submissions);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});