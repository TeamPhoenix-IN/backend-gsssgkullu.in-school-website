const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
require('dotenv').config();

const app = express();
app.use(cors({
    origin: '*', 
    methods: ['GET', 'POST', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'] 
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

const ADMIN_PASS = process.env.ADMIN_PASS || 'admin123'; 

app.post('/api/submit', async (req, res) => {
    try {
        const formData = req.body;
        
        let existingSubmission = await Submission.findOne({ aadhar: formData.aadhar });
        
        if (existingSubmission) {
            existingSubmission.student_name = formData.studentName || formData.name || 'Unknown';
            existingSubmission.full_data = JSON.stringify(formData);
            existingSubmission.timestamp = Date.now();
            await existingSubmission.save();
            return res.status(200).json({ success: true, id: existingSubmission._id, isUpdate: true });
        } else {
            const newSubmission = new Submission({
                student_name: formData.studentName || formData.name || 'Unknown',
                aadhar: formData.aadhar || 'N/A',
                full_data: JSON.stringify(formData)
            });
            const savedSubmission = await newSubmission.save();
            return res.status(200).json({ success: true, id: savedSubmission._id, isUpdate: false });
        }
    } catch (err) {
        console.error("Database error:", err.message);
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/submissions', async (req, res) => {
    if (req.headers.authorization !== ADMIN_PASS) {
        return res.status(401).json({ error: "Unauthorized" });
    }
    try {
        const submissions = await Submission.find().sort({ timestamp: -1 });
        res.status(200).json(submissions);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/submissions/aadhar/:aadhar', async (req, res) => {
    try {
        const submission = await Submission.findOne({ aadhar: req.params.aadhar }).sort({ timestamp: -1 });
        if (!submission) {
            return res.status(404).json({ error: "Not found" });
        }
        res.status(200).json(submission);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.delete('/api/submissions/:id', async (req, res) => {
    if (req.headers.authorization !== ADMIN_PASS) {
        return res.status(401).json({ error: "Unauthorized" });
    }
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
