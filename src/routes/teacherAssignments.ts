import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { authenticate, authorize, AuthRequest } from '../middleware/auth.js';

const router = Router();

// Get all teacher assignments
router.get('/', authenticate, async (req, res) => {
  try {
    const assignments = await prisma.teacherAssignment.findMany({
      include: {
        teacher: {
          include: {
            user: {
              select: {
                full_name: true,
              },
            },
          },
        },
        subject: true,
        stream: {
          include: {
            class: true,
          },
        },
        term: {
          include: {
            year: true,
          },
        },
      },
      orderBy: { id: 'desc' },
    });

    res.json(assignments);
  } catch (error) {
    console.error('Get assignments error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get assignments by teacher
router.get('/teacher/:teacherId', authenticate, async (req, res) => {
  try {
    const { teacherId } = req.params;
    
    const assignments = await prisma.teacherAssignment.findMany({
      where: { teacher_id: parseInt(teacherId) },
      include: {
        teacher: {
          include: {
            user: {
              select: {
                full_name: true,
              },
            },
          },
        },
        subject: true,
        stream: {
          include: {
            class: true,
          },
        },
        term: {
          include: {
            year: true,
          },
        },
      },
      orderBy: { id: 'desc' },
    });

    res.json(assignments);
  } catch (error) {
    console.error('Get teacher assignments error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get dropdown data for assignments
router.get('/assignment-data', authenticate, async (req, res) => {
  try {
    const [teachers, subjects, streams, terms] = await Promise.all([
      prisma.teacher.findMany({
        include: {
          user: {
            select: {
              full_name: true,
            },
          },
        },
        orderBy: { staff_id: 'asc' },
      }),
      prisma.subject.findMany({
        orderBy: { name: 'asc' },
      }),
      prisma.stream.findMany({
        include: {
          class: true,
        },
        orderBy: { name: 'asc' },
      }),
      prisma.term.findMany({
        include: {
          year: true,
        },
        orderBy: { id: 'asc' },
      }),
    ]);

    res.json({
      teachers,
      subjects,
      streams,
      terms,
    });
  } catch (error) {
    console.error('Get assignment data error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Create new teacher assignment
router.post('/', authenticate, authorize('ADMIN'), async (req, res) => {
  try {
    const schema = z.object({
      teacher_id: z.number(),
      subject_id: z.number(),
      stream_id: z.number(),
      term_id: z.number(),
    });

    const data = schema.parse(req.body);

    // Check if assignment already exists
    const existingAssignment = await prisma.teacherAssignment.findFirst({
      where: {
        teacher_id: data.teacher_id,
        subject_id: data.subject_id,
        stream_id: data.stream_id,
        term_id: data.term_id,
      },
    });

    if (existingAssignment) {
      return res.status(409).json({ error: 'This assignment already exists' });
    }

    const assignment = await prisma.teacherAssignment.create({
      data: {
        teacher_id: data.teacher_id,
        subject_id: data.subject_id,
        stream_id: data.stream_id,
        term_id: data.term_id,
      },
      include: {
        teacher: {
          include: {
            user: {
              select: {
                full_name: true,
              },
            },
          },
        },
        subject: true,
        stream: {
          include: {
            class: true,
          },
        },
        term: {
          include: {
            year: true,
          },
        },
      },
    });

    res.status(201).json({
      success: true,
      message: 'Assignment created successfully',
      assignment,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    console.error('Create assignment error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Delete teacher assignment
router.delete('/:id', authenticate, authorize('ADMIN'), async (req, res) => {
  try {
    const { id } = req.params;

    const assignment = await prisma.teacherAssignment.findUnique({
      where: { id: parseInt(id) },
    });

    if (!assignment) {
      return res.status(404).json({ error: 'Assignment not found' });
    }

    await prisma.teacherAssignment.delete({
      where: { id: parseInt(id) },
    });

    res.json({
      success: true,
      message: 'Assignment deleted successfully',
    });
  } catch (error) {
    console.error('Delete assignment error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get students by teacher assignment (for teachers to see their assigned students)
router.get('/my-students', authenticate, authorize('TEACHER'), async (req: AuthRequest, res) => {
  try {
    const teacherId = req.user?.id;

    if (!teacherId) {
      return res.status(401).json({ error: 'Teacher not found' });
    }

    // Get the teacher record
    const teacher = await prisma.teacher.findFirst({
      where: { user_id: teacherId },
    });

    if (!teacher) {
      return res.status(404).json({ error: 'Teacher profile not found' });
    }

    // Get all assignments for this teacher
    const assignments = await prisma.teacherAssignment.findMany({
      where: { teacher_id: teacher.id },
      include: {
        stream: {
          include: {
            class: true,
          },
        },
        subject: true,
        term: {
          include: {
            year: true,
          },
        },
      },
    });

    // Get all students in the assigned streams
    const streamIds = assignments.map(a => a.stream_id);
    const students = await prisma.student.findMany({
      where: {
        stream_id: {
          in: streamIds,
        },
      },
      include: {
        user: {
          select: {
            full_name: true,
            username: true,
          },
        },
        stream: {
          include: {
            class: true,
          },
        },
      },
      orderBy: {
        user: {
          full_name: 'asc',
        },
      },
    });

    res.json({
      assignments,
      students,
    });
  } catch (error) {
    console.error('Get my students error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
