const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
require('dotenv').config();

const app = express();

app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());

mongoose.connect(process.env.MONGODB_URI)
    .then(() => console.log('Connected to MongoDB Atlas'))
    .catch(err => console.error('MongoDB connection error:', err));

// ── Schemas ───────────────────────────────────────────────────────────────────

const submissionSchema = new mongoose.Schema({
    student_name: String,
    aadhar: String,
    full_data: String,
    timestamp: { type: Date, default: Date.now }
});
const Submission = mongoose.model('Submission', submissionSchema);

const noticeSchema = new mongoose.Schema({
    title:    { type: String, required: true },
    body:     { type: String, default: '' },
    badge:    { type: String, default: '' },       // "New", "Urgent", "Info", or ""
    date:     { type: String, default: '' },        // display string e.g. "01 April 2026"
    linkText: { type: String, default: '' },        // e.g. "Apply Now →"
    linkUrl:  { type: String, default: '' },        // e.g. "admissionForm.html"
    section:  { type: String, default: 'notices' }, // "notices" | "updates"
    order:    { type: Number, default: 0 },
    active:   { type: Boolean, default: true },
    createdAt:{ type: Date, default: Date.now }
});
const Notice = mongoose.model('Notice', noticeSchema);

const ADMIN_PASS = process.env.ADMIN_PASSWORD;

function requireAuth(req, res, next) {
    if (req.headers.authorization !== ADMIN_PASS) {
        return res.status(401).json({ error: 'Unauthorized' });
    }
    next();
}

// ── Admissions ────────────────────────────────────────────────────────────────

app.post('/api/submit', async (req, res) => {
    try {
        const formData = req.body;
        let existing = await Submission.findOne({ aadhar: formData.aadhar });
        if (existing) {
            existing.student_name = formData.studentName || 'Unknown';
            existing.full_data = JSON.stringify(formData);
            existing.timestamp = Date.now();
            await existing.save();
            return res.status(200).json({ success: true, id: existing._id, isUpdate: true });
        }
        const saved = await new Submission({
            student_name: formData.studentName || 'Unknown',
            aadhar: formData.aadhar || 'N/A',
            full_data: JSON.stringify(formData)
        }).save();
        return res.status(200).json({ success: true, id: saved._id, isUpdate: false });
    } catch (err) {
        console.error('Database error:', err.message);
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/submissions', requireAuth, async (req, res) => {
    try {
        const submissions = await Submission.find().sort({ timestamp: -1 });
        res.status(200).json(submissions);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/submissions/aadhar/:aadhar', async (req, res) => {
    try {
        const submission = await Submission.findOne({ aadhar: req.params.aadhar });
        if (!submission) return res.status(404).json({ error: 'Not found' });
        res.status(200).json(submission);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.delete('/api/submissions/:id', requireAuth, async (req, res) => {
    try {
        const deleted = await Submission.findByIdAndDelete(req.params.id);
        if (!deleted) return res.status(404).json({ error: 'Submission not found' });
        res.status(200).json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ── Notices ───────────────────────────────────────────────────────────────────

// Public: active notices only (index.html fetches this)
app.get('/api/notices', async (req, res) => {
    try {
        const notices = await Notice.find({ active: true }).sort({ order: 1, createdAt: -1 });
        res.status(200).json(notices);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Admin: all notices including inactive
app.get('/api/notices/all', requireAuth, async (req, res) => {
    try {
        const notices = await Notice.find().sort({ order: 1, createdAt: -1 });
        res.status(200).json(notices);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Admin: create
app.post('/api/notices', requireAuth, async (req, res) => {
    try {
        const notice = await new Notice(req.body).save();
        res.status(201).json(notice);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Admin: update
app.put('/api/notices/:id', requireAuth, async (req, res) => {
    try {
        const updated = await Notice.findByIdAndUpdate(req.params.id, req.body, { new: true });
        if (!updated) return res.status(404).json({ error: 'Notice not found' });
        res.status(200).json(updated);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Admin: delete
app.delete('/api/notices/:id', requireAuth, async (req, res) => {
    try {
        const deleted = await Notice.findByIdAndDelete(req.params.id);
        if (!deleted) return res.status(404).json({ error: 'Notice not found' });
        res.status(200).json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ── Start ─────────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
