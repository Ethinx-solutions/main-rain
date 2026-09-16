const express = require('express');
const Task = require('../models/Task');
const auth = require('../middleware/auth');

const router = express.Router();

// Get all tasks for user
router.get('/', auth, async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 20, 
      search, 
      status, 
      priority, 
      category, 
      tags, 
      sortBy = 'createdAt', 
      sortOrder = 'desc',
      dueDate
    } = req.query;

    const query = { userId: req.user._id };
    
    // Filter by status
    if (status && status !== 'all') {
      if (status === 'active') {
        query.status = { $in: ['todo', 'in-progress'] };
      } else {
        query.status = status;
      }
    }
    
    // Filter by priority
    if (priority && priority !== 'all') {
      query.priority = priority;
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
    
    // Filter by due date
    if (dueDate) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      switch (dueDate) {
        case 'today':
          const tomorrow = new Date(today);
          tomorrow.setDate(tomorrow.getDate() + 1);
          query.dueDate = { $gte: today, $lt: tomorrow };
          break;
        case 'week':
          const nextWeek = new Date(today);
          nextWeek.setDate(nextWeek.getDate() + 7);
          query.dueDate = { $gte: today, $lte: nextWeek };
          break;
        case 'overdue':
          query.dueDate = { $lt: today };
          query.status = { $ne: 'completed' };
          break;
      }
    }
    
    // Search in title and description
    if (search) {
      query.$text = { $search: search };
    }
    
    const sortOptions = {};
    sortOptions[sortBy] = sortOrder === 'desc' ? -1 : 1;
    
    const tasks = await Task.find(query)
      .sort(sortOptions)
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .exec();
    
    const total = await Task.countDocuments(query);
    
    res.json({
      tasks,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total
    });
  } catch (error) {
    console.error('Get tasks error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get single task
router.get('/:id', auth, async (req, res) => {
  try {
    const task = await Task.findOne({ 
      _id: req.params.id, 
      userId: req.user._id 
    });
    
    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }
    
    res.json(task);
  } catch (error) {
    console.error('Get task error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Create new task
router.post('/', auth, async (req, res) => {
  try {
    const { 
      title, 
      description, 
      priority, 
      category, 
      dueDate, 
      estimatedTime, 
      tags,
      subtasks
    } = req.body;
    
    if (!title) {
      return res.status(400).json({ message: 'Title is required' });
    }
    
    const task = new Task({
      title,
      description,
      priority: priority || 'medium',
      category: category || 'other',
      dueDate: dueDate ? new Date(dueDate) : undefined,
      estimatedTime,
      tags: tags || [],
      subtasks: subtasks || [],
      userId: req.user._id
    });
    
    await task.save();
    res.status(201).json(task);
  } catch (error) {
    console.error('Create task error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update task
router.put('/:id', auth, async (req, res) => {
  try {
    const { 
      title, 
      description, 
      status, 
      priority, 
      category, 
      dueDate, 
      estimatedTime, 
      actualTime, 
      tags,
      subtasks
    } = req.body;
    
    const task = await Task.findOne({ 
      _id: req.params.id, 
      userId: req.user._id 
    });
    
    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }
    
    if (title !== undefined) task.title = title;
    if (description !== undefined) task.description = description;
    if (status !== undefined) task.status = status;
    if (priority !== undefined) task.priority = priority;
    if (category !== undefined) task.category = category;
    if (dueDate !== undefined) task.dueDate = dueDate ? new Date(dueDate) : undefined;
    if (estimatedTime !== undefined) task.estimatedTime = estimatedTime;
    if (actualTime !== undefined) task.actualTime = actualTime;
    if (tags !== undefined) task.tags = tags;
    if (subtasks !== undefined) task.subtasks = subtasks;
    
    await task.save();
    res.json(task);
  } catch (error) {
    console.error('Update task error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update task status
router.patch('/:id/status', auth, async (req, res) => {
  try {
    const { status } = req.body;
    
    if (!['todo', 'in-progress', 'completed', 'cancelled'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status' });
    }
    
    const task = await Task.findOne({ 
      _id: req.params.id, 
      userId: req.user._id 
    });
    
    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }
    
    task.status = status;
    await task.save();
    
    res.json({ message: 'Task status updated successfully', task });
  } catch (error) {
    console.error('Update task status error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update subtask
router.patch('/:id/subtasks/:subtaskId', auth, async (req, res) => {
  try {
    const { completed } = req.body;
    
    const task = await Task.findOne({ 
      _id: req.params.id, 
      userId: req.user._id 
    });
    
    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }
    
    const subtask = task.subtasks.id(req.params.subtaskId);
    if (!subtask) {
      return res.status(404).json({ message: 'Subtask not found' });
    }
    
    subtask.completed = completed;
    await task.save();
    
    res.json({ message: 'Subtask updated successfully', task });
  } catch (error) {
    console.error('Update subtask error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Delete task
router.delete('/:id', auth, async (req, res) => {
  try {
    const task = await Task.findOneAndDelete({ 
      _id: req.params.id, 
      userId: req.user._id 
    });
    
    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }
    
    res.json({ message: 'Task deleted successfully' });
  } catch (error) {
    console.error('Delete task error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get task statistics
router.get('/stats/overview', auth, async (req, res) => {
  try {
    const userId = req.user._id;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const [
      totalTasks,
      completedTasks,
      inProgressTasks,
      overdueTasks,
      todayTasks,
      priorityStats,
      categoryStats,
      recentTasks
    ] = await Promise.all([
      Task.countDocuments({ userId }),
      Task.countDocuments({ userId, status: 'completed' }),
      Task.countDocuments({ userId, status: 'in-progress' }),
      Task.countDocuments({ 
        userId, 
        dueDate: { $lt: today }, 
        status: { $ne: 'completed' } 
      }),
      Task.countDocuments({ 
        userId, 
        dueDate: { $gte: today, $lt: tomorrow } 
      }),
      Task.aggregate([
        { $match: { userId, status: { $ne: 'completed' } } },
        { $group: { _id: '$priority', count: { $sum: 1 } } },
        { $sort: { count: -1 } }
      ]),
      Task.aggregate([
        { $match: { userId, status: { $ne: 'completed' } } },
        { $group: { _id: '$category', count: { $sum: 1 } } },
        { $sort: { count: -1 } }
      ]),
      Task.find({ userId })
        .sort({ createdAt: -1 })
        .limit(5)
        .select('title status priority dueDate createdAt')
    ]);
    
    res.json({
      totalTasks,
      completedTasks,
      inProgressTasks,
      overdueTasks,
      todayTasks,
      priorityStats,
      categoryStats,
      recentTasks,
      completionRate: totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0
    });
  } catch (error) {
    console.error('Get task stats error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;