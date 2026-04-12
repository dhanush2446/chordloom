import { Router } from 'express';
import Recording from '../models/Recording.js';
import { protect } from '../middleware/auth.js';

const router = Router();

// Require auth for all recording routes
router.use(protect);

/**
 * GET /api/recordings
 * Fetch all recordings for the logged-in user (excluding the heavy base64 audioData).
 */
router.get('/', async (req, res) => {
  try {
    const recordings = await Recording.find({ user: req.user.id })
      .select('-audioData -midiData') // Exclude audio and midi data to keep the list fast
      .sort({ createdAt: -1 });
      
    res.json(recordings);
  } catch (err) {
    console.error('Fetch recordings error:', err);
    res.status(500).json({ error: 'Failed to fetch recordings' });
  }
});

/**
 * GET /api/recordings/:id
 * Fetch a specific recording including its audioData so it can be played.
 */
router.get('/:id', async (req, res) => {
  try {
    const recording = await Recording.findOne({ _id: req.params.id, user: req.user.id });
    
    if (!recording) {
      return res.status(404).json({ error: 'Recording not found' });
    }
    
    res.json(recording);
  } catch (err) {
    console.error('Fetch single recording error:', err);
    res.status(500).json({ error: 'Failed to fetch recording' });
  }
});

/**
 * POST /api/recordings
 * Save a new recording.
 * Body: { title, audioData, duration }
 */
router.post('/', async (req, res) => {
  try {
    const { title, audioData, midiData, duration } = req.body;
    
    if (!audioData) {
      return res.status(400).json({ error: 'Audio data is required' });
    }

    const recording = await Recording.create({
      user: req.user.id,
      title: title || 'Untitled Session',
      audioData,
      midiData,
      duration: duration || 0
    });

    // Don't send back the huge audio/midi string
    const response = recording.toObject();
    delete response.audioData;
    delete response.midiData;
    
    res.status(201).json(response);
  } catch (err) {
    console.error('Save recording error:', err);
    res.status(500).json({ error: 'Failed to save recording' });
  }
});

/**
 * DELETE /api/recordings/:id
 * Delete a recording.
 */
router.delete('/:id', async (req, res) => {
  try {
    const recording = await Recording.findOneAndDelete({ _id: req.params.id, user: req.user.id });
    
    if (!recording) {
      return res.status(404).json({ error: 'Recording not found' });
    }
    
    res.json({ message: 'Recording deleted successfully' });
  } catch (err) {
    console.error('Delete recording error:', err);
    res.status(500).json({ error: 'Failed to delete recording' });
  }
});

export default router;
