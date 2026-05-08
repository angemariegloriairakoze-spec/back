import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { prisma } from './lib/prisma.js';
import authRoutes from './routes/auth.js';
import userRoutes from './routes/users.js';
import studentRoutes from './routes/students.js';
import teacherRoutes from './routes/teachers.js';
import academicRoutes from './routes/academics.js';
import markRoutes from './routes/marks.js';
import attendanceRoutes from './routes/attendance.js';
import disciplineRoutes from './routes/discipline.js';
import notificationRoutes from './routes/notifications.js';
import reportRoutes from './routes/reports.js';
import dashboardRoutes from './routes/dashboard.js';
import teacherAssignmentRoutes from './routes/teacherAssignments.js';
dotenv.config();
const app = express();
const PORT = process.env.PORT || 5000;
app.use(cors({
    origin: process.env.FRONTEND_URL || true,
    credentials: true
}));
app.use(express.json());
// Health check
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', time: new Date().toISOString() });
});
// One-time setup — create first admin
app.post('/api/setup', async (req, res) => {
    try {
        const schema = z.object({
            username: z.string().min(3),
            password: z.string().min(6),
            full_name: z.string().min(1),
        });
        const data = schema.parse(req.body);
        const existingUsers = await prisma.user.count();
        if (existingUsers > 0) {
            return res.status(403).json({ error: 'Setup already complete. Use login instead.' });
        }
        const hashedPassword = await bcrypt.hash(data.password, 10);
        const user = await prisma.user.create({
            data: {
                username: data.username,
                password: hashedPassword,
                role: 'ADMIN',
                full_name: data.full_name,
            },
        });
        res.status(201).json({ success: true, message: 'Admin created successfully', user: { id: user.id, username: user.username, role: user.role, full_name: user.full_name } });
    }
    catch (error) {
        if (error instanceof z.ZodError) {
            return res.status(400).json({ error: error.errors });
        }
        console.error('Setup error:', error);
        res.status(500).json({ error: 'Setup failed' });
    }
});
// Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/students', studentRoutes);
app.use('/api/teachers', teacherRoutes);
app.use('/api/academics', academicRoutes);
app.use('/api/marks', markRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/discipline', disciplineRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/teacher-assignments', teacherAssignmentRoutes);
// Error handler
app.use((err, req, res, next) => {
    console.error('Error:', err);
    if (res && typeof res.status === 'function') {
        res.status(500).json({ error: 'Internal server error' });
    }
    else {
        console.error('Invalid response object in error handler');
    }
});
app.listen(PORT, () => {
    console.log(`🚀 Server running at http://localhost:${PORT}`);
    console.log(`📚 API Documentation:`);
    console.log(`   Health:    GET  /api/health`);
    console.log(`   Auth:      POST /api/auth/login`);
    console.log(`   Students:  GET  /api/students`);
    console.log(`   Teachers:  GET  /api/teachers`);
    console.log(`   Academics: GET  /api/academics/years`);
    console.log(`   Marks:     GET  /api/marks/student/:id`);
    console.log(`   Dashboard: GET  /api/dashboard/stats`);
});
//# sourceMappingURL=index.js.map