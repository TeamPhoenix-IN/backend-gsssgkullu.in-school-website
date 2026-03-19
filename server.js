const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
require('dotenv').config();

const app = express();
app.use(cors({
    origin: '*', 
    methods: ['GET', 'POST', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type']
}));
app.use(express.json());

mongoose.connect(process.env.MONGODB_URI)
    .then(() => console.log('Connected to MongoDB Atlas'))
    .catch(err => console.error('MongoDB connection error:', err));

const submissionSchema = new mongoose.Schema({
    student_name: String,
    aadhar: String,
    full_data: String,
    timestamp: { type: Date, default: Date.now }
});

const Submission = mongoose.model('Submission', submissionSchema);

app.post('/api/submit', async (req, res) => {
    try {
        const formData = req.body;

        if (!formData.aadhar) {
            return res.status(400).json({ error: "Aadhar number is required." });
        }

        const savedSubmission = await Submission.findOneAndUpdate(
            { aadhar: formData.aadhar }, 
            { 
                student_name: formData.studentName || formData.name || 'Unknown',
                aadhar: formData.aadhar,
                full_data: JSON.stringify(formData),
                timestamp: Date.now() 
            },
            { new: true, upsert: true } 
        );
        
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

app.delete('/api/submissions/:id', async (req, res) => {
    try {
        const deletedSubmission = await Submission.findByIdAndDelete(req.params.id);
        if (!deletedSubmission) {
            return res.status(404).json({ error: "Submission not found" });
        }
        res.status(200).json({ success: true, message: "Submission deleted" });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
