import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

// Dashboard statistics
router.get('/stats', authenticate, async (req, res) => {
  try {
    const [
      students,
      teachers,
      users,
      classes,
      streams,
      subjects,
      attendanceToday,
      recentIncidents,
    ] = await Promise.all([
      prisma.student.count(),
      prisma.teacher.count(),
      prisma.user.count(),
      prisma.class.count(),
      prisma.stream.count(),
      prisma.subject.count(),
      prisma.attendance.count({
        where: {
          date: {
            gte: new Date(new Date().setHours(0, 0, 0, 0)),
            lt: new Date(new Date().setHours(23, 59, 59, 999)),
          },
          status: 'PRESENT',
        },
      }),
      prisma.disciplineIncident.count({
        where: {
          date: {
            gte: new Date(new Date().setDate(new Date().getDate() - 30)),
          },
        },
      }),
    ]);

    res.json({
      students,
      teachers,
      users,
      classes,
      streams,
      subjects,
      attendanceToday,
      recentIncidents,
    });
  } catch (error) {
    console.error('Dashboard stats error:', error);
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

// Recent activity
router.get('/recent', authenticate, async (req, res) => {
  try {
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 10;

    const [recentStudents, recentIncidents, recentMarks] = await Promise.all([
      prisma.student.findMany({
        take: limit,
        orderBy: { user: { created_at: 'desc' } },
        include: {
          user: {
            select: {
              full_name: true,
              created_at: true,
            },
          },
          class: true,
        },
      }),
      prisma.disciplineIncident.findMany({
        take: limit,
        orderBy: { date: 'desc' },
        include: {
          student: {
            include: {
              user: {
                select: {
                  full_name: true,
                },
              },
            },
          },
        },
      }),
      prisma.mark.findMany({
        take: limit,
        orderBy: { id: 'desc' },
        include: {
          student: {
            include: {
              user: {
                select: {
                  full_name: true,
                },
              },
            },
          },
          subject: true,
        },
      }),
    ]);

    res.json({
      recentStudents,
      recentIncidents,
      recentMarks,
    });
  } catch (error) {
    console.error('Recent activity error:', error);
    res.status(500).json({ error: 'Failed to fetch recent activity' });
  }
});

export default router;
