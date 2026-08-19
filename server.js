const express    = require('express');
const cors       = require('cors');
const mongoose   = require('mongoose');
const multer     = require('multer');
const path       = require('path');
const fs         = require('fs');
require('dotenv').config();

const app = express();
app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());

// ── Serve uploaded images statically ─────────────────────────────────────────
const UPLOADS_DIR = path.join(__dirname, 'uploads');
if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR);
app.use('/uploads', express.static(UPLOADS_DIR));

// ── Multer — file upload config ───────────────────────────────────────────────
const storage = multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, UPLOADS_DIR),
    filename:    (_req, file, cb) => {
        const unique = Date.now() + '-' + Math.round(Math.random() * 1e9);
        cb(null, unique + path.extname(file.originalname));
    }
});
const upload = multer({
    storage,
    limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
    fileFilter: (_req, file, cb) => {
        if (file.mimetype.startsWith('image/')) cb(null, true);
        else cb(new Error('Only image files are allowed'));
    }
});

// ── MongoDB ───────────────────────────────────────────────────────────────────
mongoose.connect(process.env.MONGODB_URI)
    .then(() => console.log('Connected to MongoDB Atlas'))
    .catch(err => console.error('MongoDB connection error:', err));

// ── Schemas ───────────────────────────────────────────────────────────────────
const submissionSchema = new mongoose.Schema({
    student_name: String,
    aadhar:       String,
    full_data:    String,
    timestamp:    { type: Date, default: Date.now }
});
const Submission = mongoose.model('Submission', submissionSchema);

const noticeSchema = new mongoose.Schema({
    section:  { type: String, default: 'notices' },
    badge:    String,
    title:    { type: String, required: true },
    body:     String,
    date:     String,
    order:    { type: Number, default: 0 },
    linkText: String,
    linkUrl:  String,
    active:   { type: Boolean, default: true },
    createdAt:{ type: Date, default: Date.now }
});
const Notice = mongoose.model('Notice', noticeSchema);

const gallerySchema = new mongoose.Schema({
    title:    { type: String, required: true },
    caption:  String,
    url:      { type: String, required: true },
    category: { type: String, default: 'events' },
    order:    { type: Number, default: 0 },
    active:   { type: Boolean, default: true },
    addedAt:  { type: Date, default: Date.now }
});
const GalleryImage = mongoose.model('GalleryImage', gallerySchema);

// ── Auth middleware ───────────────────────────────────────────────────────────
const ADMIN_PASS = process.env.ADMIN_PASSWORD;

function requireAdmin(req, res, next) {
    if (req.headers.authorization !== ADMIN_PASS) {
        return res.status(401).json({ error: 'Unauthorized' });
    }
    next();
}

// ═══════════════════════════════════════════════════════════════════════════════
// ADMISSIONS
// ═══════════════════════════════════════════════════════════════════════════════
app.post('/api/submit', async (req, res) => {
    try {
        const formData = req.body;
        let existing = await Submission.findOne({ aadhar: formData.aadhar });
        if (existing) {
            existing.student_name = formData.studentName || formData.name || 'Unknown';
            existing.full_data    = JSON.stringify(formData);
            existing.timestamp    = Date.now();
            await existing.save();
            return res.status(200).json({ success: true, id: existing._id, isUpdate: true });
        } else {
            const newSub = new Submission({
                student_name: formData.studentName || formData.name || 'Unknown',
                aadhar:       formData.aadhar || 'N/A',
                full_data:    JSON.stringify(formData)
            });
            const saved = await newSub.save();
            return res.status(200).json({ success: true, id: saved._id, isUpdate: false });
        }
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/submissions', requireAdmin, async (req, res) => {
    try {
        const subs = await Submission.find().sort({ timestamp: -1 });
        res.status(200).json(subs);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/submissions/aadhar/:aadhar', async (req, res) => {
    try {
        const sub = await Submission.findOne({ aadhar: req.params.aadhar }).sort({ timestamp: -1 });
        if (!sub) return res.status(404).json({ error: 'Not found' });
        res.status(200).json(sub);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.delete('/api/submissions/:id', requireAdmin, async (req, res) => {
    try {
        const del = await Submission.findByIdAndDelete(req.params.id);
        if (!del) return res.status(404).json({ error: 'Not found' });
        res.status(200).json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.put('/api/submissions/:id', requireAdmin, async (req, res) => {
    try {
        const { student_name, aadhar, full_data } = req.body;
        const updated = await Submission.findByIdAndUpdate(
            req.params.id,
            { student_name, aadhar, full_data },
            { new: true }
        );
        if (!updated) return res.status(404).json({ error: 'Not found' });
        res.status(200).json(updated);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ═══════════════════════════════════════════════════════════════════════════════
// NOTICES
// ═══════════════════════════════════════════════════════════════════════════════

// Public: active notices for homepage
app.get('/api/notices', async (req, res) => {
    try {
        const notices = await Notice.find({ active: true }).sort({ order: 1, createdAt: -1 });
        res.json(notices);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Admin: all notices
app.get('/api/notices/all', requireAdmin, async (req, res) => {
    try {
        const notices = await Notice.find().sort({ order: 1, createdAt: -1 });
        res.json(notices);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/notices', requireAdmin, async (req, res) => {
    try {
        const notice = new Notice(req.body);
        const saved  = await notice.save();
        res.status(201).json(saved);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.put('/api/notices/:id', requireAdmin, async (req, res) => {
    try {
        const updated = await Notice.findByIdAndUpdate(req.params.id, req.body, { new: true });
        if (!updated) return res.status(404).json({ error: 'Not found' });
        res.json(updated);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.delete('/api/notices/:id', requireAdmin, async (req, res) => {
    try {
        await Notice.findByIdAndDelete(req.params.id);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ═══════════════════════════════════════════════════════════════════════════════
// GALLERY
// ═══════════════════════════════════════════════════════════════════════════════

// Public: active images (used by gallery.js to load dynamic images)
app.get('/api/gallery', async (req, res) => {
    try {
        const images = await GalleryImage.find({ active: true }).sort({ order: 1, addedAt: -1 });
        res.json(images);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Admin: all images
app.get('/api/gallery/all', requireAdmin, async (req, res) => {
    try {
        const images = await GalleryImage.find().sort({ order: 1, addedAt: -1 });
        res.json(images);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Admin: upload image file → returns URL
app.post('/api/gallery/upload', requireAdmin, upload.single('image'), (req, res) => {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
    // Build the public URL. Adjust the BASE_URL env var on Render to match your domain.
    const baseUrl = process.env.BASE_URL || `http://localhost:${process.env.PORT || 3000}`;
    const url = `${baseUrl}/uploads/${req.file.filename}`;
    res.json({ url, filename: req.file.filename });
});

// Admin: add image record (URL already known)
app.post('/api/gallery', requireAdmin, async (req, res) => {
    try {
        const img   = new GalleryImage(req.body);
        const saved = await img.save();
        res.status(201).json(saved);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Admin: update image record
app.put('/api/gallery/:id', requireAdmin, async (req, res) => {
    try {
        const updated = await GalleryImage.findByIdAndUpdate(req.params.id, req.body, { new: true });
        if (!updated) return res.status(404).json({ error: 'Not found' });
        res.json(updated);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Admin: delete image record (does NOT delete the physical file — you may want to add that)
app.delete('/api/gallery/:id', requireAdmin, async (req, res) => {
    try {
        const img = await GalleryImage.findByIdAndDelete(req.params.id);
        if (!img) return res.status(404).json({ error: 'Not found' });
        // Optionally remove physical file if it's a local upload
        if (img.url && img.url.includes('/uploads/')) {
            const filename = path.basename(img.url);
            const filepath = path.join(UPLOADS_DIR, filename);
            fs.unlink(filepath, () => {}); // silently ignore if already gone
        }
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ─────────────────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
