const express = require('express');
const Note = require('../models/Note');
const auth = require('../middleware/auth');

const router = express.Router();

// Get all notes for user
router.get('/', auth, async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 20, 
      search, 
      category, 
      tags, 
      sortBy = 'createdAt', 
      sortOrder = 'desc',
      archived = 'false',
      favorite
    } = req.query;

    const query = { userId: req.user._id };
    
    // Filter by archived status
    query.isArchived = archived === 'true';
    
    // Filter by favorite
    if (favorite === 'true') {
      query.isFavorite = true;
    }
    
    // Filter by category
    if (category && category !== 'all') {
      query.category = category;
    }
    
    // Filter by tags
    if (tags) {
      const tagArray = tags.split(',').map(tag => tag.trim());
      query.tags = { $in: tagArray };
    }
    
    // Search in title and content
    if (search) {
      query.$text = { $search: search };
    }
    
    const sortOptions = {};
    sortOptions[sortBy] = sortOrder === 'desc' ? -1 : 1;
    
    const notes = await Note.find(query)
      .sort(sortOptions)
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .exec();
    
    const total = await Note.countDocuments(query);
    
    res.json({
      notes,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total
    });
  } catch (error) {
    console.error('Get notes error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get single note
router.get('/:id', auth, async (req, res) => {
  try {
    const note = await Note.findOne({ 
      _id: req.params.id, 
      userId: req.user._id 
    });
    
    if (!note) {
      return res.status(404).json({ message: 'Note not found' });
    }
    
    res.json(note);
  } catch (error) {
    console.error('Get note error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Create new note
router.post('/', auth, async (req, res) => {
  try {
    const { title, content, tags, category, priority } = req.body;
    
    if (!title || !content) {
      return res.status(400).json({ message: 'Title and content are required' });
    }
    
    const note = new Note({
      title,
      content,
      tags: tags || [],
      category: category || 'other',
      priority: priority || 'medium',
      userId: req.user._id
    });
    
    await note.save();
    res.status(201).json(note);
  } catch (error) {
    console.error('Create note error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update note
router.put('/:id', auth, async (req, res) => {
  try {
    const { title, content, tags, category, priority, isFavorite } = req.body;
    
    const note = await Note.findOne({ 
      _id: req.params.id, 
      userId: req.user._id 
    });
    
    if (!note) {
      return res.status(404).json({ message: 'Note not found' });
    }
    
    if (title !== undefined) note.title = title;
    if (content !== undefined) note.content = content;
    if (tags !== undefined) note.tags = tags;
    if (category !== undefined) note.category = category;
    if (priority !== undefined) note.priority = priority;
    if (isFavorite !== undefined) note.isFavorite = isFavorite;
    
    await note.save();
    res.json(note);
  } catch (error) {
    console.error('Update note error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Archive/Unarchive note
router.patch('/:id/archive', auth, async (req, res) => {
  try {
    const { archived } = req.body;
    
    const note = await Note.findOne({ 
      _id: req.params.id, 
      userId: req.user._id 
    });
    
    if (!note) {
      return res.status(404).json({ message: 'Note not found' });
    }
    
    note.isArchived = archived;
    await note.save();
    
    res.json({ message: `Note ${archived ? 'archived' : 'unarchived'} successfully` });
  } catch (error) {
    console.error('Archive note error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Delete note
router.delete('/:id', auth, async (req, res) => {
  try {
    const note = await Note.findOneAndDelete({ 
      _id: req.params.id, 
      userId: req.user._id 
    });
    
    if (!note) {
      return res.status(404).json({ message: 'Note not found' });
    }
    
    res.json({ message: 'Note deleted successfully' });
  } catch (error) {
    console.error('Delete note error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get note statistics
router.get('/stats/overview', auth, async (req, res) => {
  try {
    const userId = req.user._id;
    
    const [
      totalNotes,
      archivedNotes,
      favoriteNotes,
      categoryStats,
      recentNotes
    ] = await Promise.all([
      Note.countDocuments({ userId, isArchived: false }),
      Note.countDocuments({ userId, isArchived: true }),
      Note.countDocuments({ userId, isFavorite: true }),
      Note.aggregate([
        { $match: { userId, isArchived: false } },
        { $group: { _id: '$category', count: { $sum: 1 } } },
        { $sort: { count: -1 } }
      ]),
      Note.find({ userId, isArchived: false })
        .sort({ createdAt: -1 })
        .limit(5)
        .select('title createdAt category')
    ]);
    
    res.json({
      totalNotes,
      archivedNotes,
      favoriteNotes,
      categoryStats,
      recentNotes
    });
  } catch (error) {
    console.error('Get note stats error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;