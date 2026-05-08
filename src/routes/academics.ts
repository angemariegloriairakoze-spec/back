import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = Router();

// ========== ACADEMIC YEARS ==========

router.get('/years', authenticate, async (req, res) => {
  try {
    const years = await prisma.academicYear.findMany({
      include: {
        terms: {
          orderBy: { id: 'asc' },
        },
      },
      orderBy: { id: 'desc' },
    });
    res.json(years);
  } catch (error) {
    console.error('Get years error:', error);
    res.status(500).json({ error: 'Failed to fetch academic years' });
  }
});

router.post('/years', authenticate, authorize('ADMIN'), async (req, res) => {
  try {
    const schema = z.object({
      name: z.string().min(1),
    });

    const { name } = schema.parse(req.body);

    const year = await prisma.academicYear.create({
      data: { name },
    });

    res.status(201).json({ success: true, year });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    console.error('Create year error:', error);
    res.status(500).json({ error: 'Failed to create academic year' });
  }
});

// ========== TERMS ==========

router.get('/terms', authenticate, async (req, res) => {
  try {
    const terms = await prisma.term.findMany({
      include: {
        year: true,
      },
      orderBy: { id: 'desc' },
    });
    res.json(terms);
  } catch (error) {
    console.error('Get terms error:', error);
    res.status(500).json({ error: 'Failed to fetch terms' });
  }
});

router.post('/terms', authenticate, authorize('ADMIN'), async (req, res) => {
  try {
    const schema = z.object({
      year_id: z.number(),
      name: z.string().min(1),
      start_date: z.string().datetime().optional(),
      end_date: z.string().datetime().optional(),
    });

    const data = schema.parse(req.body);

    const term = await prisma.term.create({
      data: {
        year_id: data.year_id,
        name: data.name,
        start_date: data.start_date ? new Date(data.start_date) : null,
        end_date: data.end_date ? new Date(data.end_date) : null,
      },
      include: {
        year: true,
      },
    });

    res.status(201).json({ success: true, term });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    console.error('Create term error:', error);
    res.status(500).json({ error: 'Failed to create term' });
  }
});

// ========== CLASSES ==========

router.get('/classes', authenticate, async (req, res) => {
  try {
    const classes = await prisma.class.findMany({
      include: {
        streams: true,
        _count: {
          select: { students: true },
        },
      },
      orderBy: { name: 'asc' },
    });
    res.json(classes);
  } catch (error) {
    console.error('Get classes error:', error);
    res.status(500).json({ error: 'Failed to fetch classes' });
  }
});

router.post('/classes', authenticate, authorize('ADMIN'), async (req, res) => {
  try {
    const schema = z.object({
      name: z.string().min(1),
    });

    const { name } = schema.parse(req.body);

    const cls = await prisma.class.create({
      data: { name },
    });

    res.status(201).json({ success: true, class: cls });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    console.error('Create class error:', error);
    res.status(500).json({ error: 'Failed to create class' });
  }
});

// ========== STREAMS ==========

router.get('/streams', authenticate, async (req, res) => {
  try {
    const streams = await prisma.stream.findMany({
      include: {
        class: true,
        _count: {
          select: { students: true },
        },
      },
      orderBy: { name: 'asc' },
    });
    res.json(streams);
  } catch (error) {
    console.error('Get streams error:', error);
    res.status(500).json({ error: 'Failed to fetch streams' });
  }
});

router.post('/streams', authenticate, authorize('ADMIN'), async (req, res) => {
  try {
    const schema = z.object({
      class_id: z.number(),
      name: z.string().min(1),
    });

    const data = schema.parse(req.body);

    const stream = await prisma.stream.create({
      data: {
        class_id: data.class_id,
        name: data.name,
      },
      include: {
        class: true,
      },
    });

    res.status(201).json({ success: true, stream });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    console.error('Create stream error:', error);
    res.status(500).json({ error: 'Failed to create stream' });
  }
});

// ========== SUBJECTS ==========

router.get('/subjects', authenticate, async (req, res) => {
  try {
    const subjects = await prisma.subject.findMany({
      orderBy: { name: 'asc' },
    });
    res.json(subjects);
  } catch (error) {
    console.error('Get subjects error:', error);
    res.status(500).json({ error: 'Failed to fetch subjects' });
  }
});

router.post('/subjects', authenticate, authorize('ADMIN'), async (req, res) => {
  try {
    const schema = z.object({
      name: z.string().min(1),
      code: z.string().optional(),
      category: z.enum(['CORE', 'ELECTIVE']).default('CORE'),
    });

    const data = schema.parse(req.body);

    const subject = await prisma.subject.create({
      data: {
        name: data.name,
        code: data.code || null,
        category: data.category,
      },
    });

    res.status(201).json({ success: true, subject });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    console.error('Create subject error:', error);
    res.status(500).json({ error: 'Failed to create subject' });
  }
});

// ========== TEACHER ASSIGNMENTS ==========

router.get('/assignments', authenticate, async (req, res) => {
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
    });
    res.json(assignments);
  } catch (error) {
    console.error('Get assignments error:', error);
    res.status(500).json({ error: 'Failed to fetch assignments' });
  }
});

router.post('/assignments', authenticate, authorize('ADMIN'), async (req, res) => {
  try {
    const schema = z.object({
      teacher_id: z.number(),
      subject_id: z.number(),
      stream_id: z.number(),
      term_id: z.number(),
    });

    const data = schema.parse(req.body);

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
        term: true,
      },
    });

    res.status(201).json({ success: true, assignment });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    console.error('Create assignment error:', error);
    res.status(500).json({ error: 'Failed to create assignment' });
  }
});

router.delete('/assignments/:id', authenticate, authorize('ADMIN'), async (req, res) => {
  try {
    const id = parseInt(req.params.id);

    await prisma.teacherAssignment.delete({
      where: { id },
    });

    res.json({ success: true, message: 'Assignment deleted' });
  } catch (error) {
    console.error('Delete assignment error:', error);
    res.status(500).json({ error: 'Failed to delete assignment' });
  }
});

export default router;
