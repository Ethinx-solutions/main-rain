const express = require('express');
const Note = require('../models/Note');
const Task = require('../models/Task');
const Link = require('../models/Link');
const auth = require('../middleware/auth');

const router = express.Router();

// Get dashboard overview
router.get('/overview', auth, async (req, res) => {
  try {
    const userId = req.user._id;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const weekFromNow = new Date(today);
    weekFromNow.setDate(weekFromNow.getDate() + 7);

    // Get counts and statistics
    const [
      // Notes stats
      totalNotes,
      recentNotes,
      
      // Tasks stats
      totalTasks,
      completedTasks,
      todayTasks,
      overdueTasks,
      upcomingTasks,
      
      // Links stats
      totalLinks,
      recentLinks,
      
      // Recent activity
      recentActivity
    ] = await Promise.all([
      // Notes
      Note.countDocuments({ userId, isArchived: false }),
      Note.find({ userId, isArchived: false })
        .sort({ createdAt: -1 })
        .limit(3)
        .select('title createdAt category'),
      
      // Tasks
      Task.countDocuments({ userId }),
      Task.countDocuments({ userId, status: 'completed' }),
      Task.countDocuments({ 
        userId, 
        dueDate: { $gte: today, $lt: tomorrow },
        status: { $ne: 'completed' }
      }),
      Task.countDocuments({ 
        userId, 
        dueDate: { $lt: today }, 
        status: { $ne: 'completed' } 
      }),
      Task.find({ 
        userId, 
        dueDate: { $gte: today, $lte: weekFromNow },
        status: { $ne: 'completed' }
      })
        .sort({ dueDate: 1 })
        .limit(5)
        .select('title dueDate priority status'),
      
      // Links
      Link.countDocuments({ userId, isArchived: false }),
      Link.find({ userId, isArchived: false })
        .sort({ createdAt: -1 })
        .limit(3)
        .select('title url createdAt category'),
      
      // Recent activity (last 7 days)
      getRecentActivity(userId, 7)
    ]);

    // Calculate completion rate
    const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

    // Get productivity insights
    const productivityInsights = await getProductivityInsights(userId);

    res.json({
      summary: {
        totalNotes,
        totalTasks,
        completedTasks,
        totalLinks,
        completionRate,
        todayTasks,
        overdueTasks
      },
      recentNotes,
      upcomingTasks,
      recentLinks,
      recentActivity,
      productivityInsights
    });
  } catch (error) {
    console.error('Get dashboard overview error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get daily view
router.get('/daily', auth, async (req, res) => {
  try {
    const userId = req.user._id;
    const { date } = req.query;
    
    const targetDate = date ? new Date(date) : new Date();
    targetDate.setHours(0, 0, 0, 0);
    const nextDay = new Date(targetDate);
    nextDay.setDate(nextDay.getDate() + 1);

    const [
      // Tasks for the day
      todayTasks,
      
      // Notes created today
      todayNotes,
      
      // Links added today
      todayLinks,
      
      // Completed tasks today
      completedToday
    ] = await Promise.all([
      Task.find({ 
        userId, 
        dueDate: { $gte: targetDate, $lt: nextDay }
      }).sort({ priority: -1, createdAt: 1 }),
      
      Note.find({ 
        userId, 
        createdAt: { $gte: targetDate, $lt: nextDay }
      }).sort({ createdAt: -1 }),
      
      Link.find({ 
        userId, 
        createdAt: { $gte: targetDate, $lt: nextDay }
      }).sort({ createdAt: -1 }),
      
      Task.find({ 
        userId, 
        completedAt: { $gte: targetDate, $lt: nextDay }
      }).sort({ completedAt: -1 })
    ]);

    // Calculate daily progress
    const totalTasksToday = todayTasks.length;
    const completedTasksToday = todayTasks.filter(task => task.status === 'completed').length;
    const dailyProgress = totalTasksToday > 0 ? Math.round((completedTasksToday / totalTasksToday) * 100) : 0;

    res.json({
      date: targetDate,
      tasks: todayTasks,
      notes: todayNotes,
      links: todayLinks,
      completedTasks: completedToday,
      progress: {
        total: totalTasksToday,
        completed: completedTasksToday,
        percentage: dailyProgress
      }
    });
  } catch (error) {
    console.error('Get daily view error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get weekly analytics
router.get('/analytics/weekly', auth, async (req, res) => {
  try {
    const userId = req.user._id;
    const today = new Date();
    const weekAgo = new Date(today);
    weekAgo.setDate(weekAgo.getDate() - 7);

    const [
      tasksCompleted,
      notesCreated,
      linksAdded,
      dailyActivity
    ] = await Promise.all([
      Task.aggregate([
        {
          $match: {
            userId,
            completedAt: { $gte: weekAgo, $lte: today }
          }
        },
        {
          $group: {
            _id: { $dateToString: { format: "%Y-%m-%d", date: "$completedAt" } },
            count: { $sum: 1 }
          }
        },
        { $sort: { _id: 1 } }
      ]),
      
      Note.aggregate([
        {
          $match: {
            userId,
            createdAt: { $gte: weekAgo, $lte: today }
          }
        },
        {
          $group: {
            _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
            count: { $sum: 1 }
          }
        },
        { $sort: { _id: 1 } }
      ]),
      
      Link.aggregate([
        {
          $match: {
            userId,
            createdAt: { $gte: weekAgo, $lte: today }
          }
        },
        {
          $group: {
            _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
            count: { $sum: 1 }
          }
        },
        { $sort: { _id: 1 } }
      ]),
      
      getDailyActivityChart(userId, 7)
    ]);

    res.json({
      tasksCompleted,
      notesCreated,
      linksAdded,
      dailyActivity
    });
  } catch (error) {
    console.error('Get weekly analytics error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Helper function to get recent activity
async function getRecentActivity(userId, days = 7) {
  const since = new Date();
  since.setDate(since.getDate() - days);

  const [notes, tasks, links] = await Promise.all([
    Note.find({ userId, createdAt: { $gte: since } })
      .sort({ createdAt: -1 })
      .limit(10)
      .select('title createdAt')
      .lean(),
    Task.find({ userId, createdAt: { $gte: since } })
      .sort({ createdAt: -1 })
      .limit(10)
      .select('title createdAt status')
      .lean(),
    Link.find({ userId, createdAt: { $gte: since } })
      .sort({ createdAt: -1 })
      .limit(10)
      .select('title url createdAt')
      .lean()
  ]);

  // Combine and sort all activities
  const activities = [
    ...notes.map(note => ({ ...note, type: 'note', action: 'created' })),
    ...tasks.map(task => ({ ...task, type: 'task', action: 'created' })),
    ...links.map(link => ({ ...link, type: 'link', action: 'added' }))
  ].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  return activities.slice(0, 15);
}

// Helper function to get productivity insights
async function getProductivityInsights(userId) {
  const today = new Date();
  const weekAgo = new Date(today);
  weekAgo.setDate(weekAgo.getDate() - 7);
  const monthAgo = new Date(today);
  monthAgo.setDate(monthAgo.getDate() - 30);

  const [
    weeklyTasksCompleted,
    monthlyTasksCompleted,
    averageTasksPerDay,
    mostProductiveDay
  ] = await Promise.all([
    Task.countDocuments({
      userId,
      status: 'completed',
      completedAt: { $gte: weekAgo }
    }),
    Task.countDocuments({
      userId,
      status: 'completed',
      completedAt: { $gte: monthAgo }
    }),
    Task.aggregate([
      {
        $match: {
          userId,
          status: 'completed',
          completedAt: { $gte: monthAgo }
        }
      },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$completedAt" } },
          count: { $sum: 1 }
        }
      },
      {
        $group: {
          _id: null,
          avgTasks: { $avg: "$count" }
        }
      }
    ]),
    Task.aggregate([
      {
        $match: {
          userId,
          status: 'completed',
          completedAt: { $gte: monthAgo }
        }
      },
      {
        $group: {
          _id: { $dayOfWeek: "$completedAt" },
          count: { $sum: 1 }
        }
      },
      { $sort: { count: -1 } },
      { $limit: 1 }
    ])
  ]);

  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  
  return {
    weeklyTasksCompleted,
    monthlyTasksCompleted,
    averageTasksPerDay: averageTasksPerDay[0]?.avgTasks || 0,
    mostProductiveDay: mostProductiveDay[0] ? dayNames[mostProductiveDay[0]._id - 1] : 'No data'
  };
}

// Helper function to get daily activity chart data
async function getDailyActivityChart(userId, days = 7) {
  const today = new Date();
  const startDate = new Date(today);
  startDate.setDate(startDate.getDate() - days);

  const activities = await Task.aggregate([
    {
      $match: {
        userId,
        completedAt: { $gte: startDate, $lte: today }
      }
    },
    {
      $group: {
        _id: { $dateToString: { format: "%Y-%m-%d", date: "$completedAt" } },
        completed: { $sum: 1 }
      }
    },
    { $sort: { _id: 1 } }
  ]);

  // Fill in missing days with 0
  const result = [];
  for (let i = 0; i < days; i++) {
    const date = new Date(startDate);
    date.setDate(date.getDate() + i);
    const dateStr = date.toISOString().split('T')[0];
    
    const activity = activities.find(a => a._id === dateStr);
    result.push({
      date: dateStr,
      completed: activity ? activity.completed : 0
    });
  }

  return result;
}

module.exports = router;