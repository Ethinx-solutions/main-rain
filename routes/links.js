const express = require('express');
const Link = require('../models/Link');
const auth = require('../middleware/auth');

const router = express.Router();

// Get all links for user
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
    
    // Search in title, description, and URL
    if (search) {
      query.$text = { $search: search };
    }
    
    const sortOptions = {};
    sortOptions[sortBy] = sortOrder === 'desc' ? -1 : 1;
    
    const links = await Link.find(query)
      .sort(sortOptions)
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .exec();
    
    const total = await Link.countDocuments(query);
    
    res.json({
      links,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total
    });
  } catch (error) {
    console.error('Get links error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get single link
router.get('/:id', auth, async (req, res) => {
  try {
    const link = await Link.findOne({ 
      _id: req.params.id, 
      userId: req.user._id 
    });
    
    if (!link) {
      return res.status(404).json({ message: 'Link not found' });
    }
    
    res.json(link);
  } catch (error) {
    console.error('Get link error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Create new link
router.post('/', auth, async (req, res) => {
  try {
    const { title, url, description, category, tags } = req.body;
    
    if (!title || !url) {
      return res.status(400).json({ message: 'Title and URL are required' });
    }
    
    // Basic URL validation
    try {
      new URL(url);
    } catch (error) {
      return res.status(400).json({ message: 'Invalid URL format' });
    }
    
    const link = new Link({
      title,
      url,
      description,
      category: category || 'other',
      tags: tags || [],
      userId: req.user._id
    });
    
    await link.save();
    res.status(201).json(link);
  } catch (error) {
    console.error('Create link error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update link
router.put('/:id', auth, async (req, res) => {
  try {
    const { title, url, description, category, tags, isFavorite } = req.body;
    
    const link = await Link.findOne({ 
      _id: req.params.id, 
      userId: req.user._id 
    });
    
    if (!link) {
      return res.status(404).json({ message: 'Link not found' });
    }
    
    if (title !== undefined) link.title = title;
    if (url !== undefined) {
      try {
        new URL(url);
        link.url = url;
      } catch (error) {
        return res.status(400).json({ message: 'Invalid URL format' });
      }
    }
    if (description !== undefined) link.description = description;
    if (category !== undefined) link.category = category;
    if (tags !== undefined) link.tags = tags;
    if (isFavorite !== undefined) link.isFavorite = isFavorite;
    
    await link.save();
    res.json(link);
  } catch (error) {
    console.error('Update link error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Record link click
router.post('/:id/click', auth, async (req, res) => {
  try {
    const link = await Link.findOne({ 
      _id: req.params.id, 
      userId: req.user._id 
    });
    
    if (!link) {
      return res.status(404).json({ message: 'Link not found' });
    }
    
    await link.recordClick();
    res.json({ message: 'Click recorded successfully' });
  } catch (error) {
    console.error('Record click error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Archive/Unarchive link
router.patch('/:id/archive', auth, async (req, res) => {
  try {
    const { archived } = req.body;
    
    const link = await Link.findOne({ 
      _id: req.params.id, 
      userId: req.user._id 
    });
    
    if (!link) {
      return res.status(404).json({ message: 'Link not found' });
    }
    
    link.isArchived = archived;
    await link.save();
    
    res.json({ message: `Link ${archived ? 'archived' : 'unarchived'} successfully` });
  } catch (error) {
    console.error('Archive link error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Delete link
router.delete('/:id', auth, async (req, res) => {
  try {
    const link = await Link.findOneAndDelete({ 
      _id: req.params.id, 
      userId: req.user._id 
    });
    
    if (!link) {
      return res.status(404).json({ message: 'Link not found' });
    }
    
    res.json({ message: 'Link deleted successfully' });
  } catch (error) {
    console.error('Delete link error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get link statistics
router.get('/stats/overview', auth, async (req, res) => {
  try {
    const userId = req.user._id;
    
    const [
      totalLinks,
      archivedLinks,
      favoriteLinks,
      categoryStats,
      mostClicked,
      recentLinks
    ] = await Promise.all([
      Link.countDocuments({ userId, isArchived: false }),
      Link.countDocuments({ userId, isArchived: true }),
      Link.countDocuments({ userId, isFavorite: true }),
      Link.aggregate([
        { $match: { userId, isArchived: false } },
        { $group: { _id: '$category', count: { $sum: 1 } } },
        { $sort: { count: -1 } }
      ]),
      Link.find({ userId, isArchived: false })
        .sort({ clickCount: -1 })
        .limit(5)
        .select('title url clickCount lastClicked'),
      Link.find({ userId, isArchived: false })
        .sort({ createdAt: -1 })
        .limit(5)
        .select('title url createdAt category')
    ]);
    
    res.json({
      totalLinks,
      archivedLinks,
      favoriteLinks,
      categoryStats,
      mostClicked,
      recentLinks
    });
  } catch (error) {
    console.error('Get link stats error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get popular domains
router.get('/stats/domains', auth, async (req, res) => {
  try {
    const userId = req.user._id;
    
    const domainStats = await Link.aggregate([
      { $match: { userId, isArchived: false } },
      { $group: { 
        _id: '$metadata.domain', 
        count: { $sum: 1 },
        totalClicks: { $sum: '$clickCount' }
      }},
      { $sort: { count: -1 } },
      { $limit: 10 }
    ]);
    
    res.json(domainStats);
  } catch (error) {
    console.error('Get domain stats error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;