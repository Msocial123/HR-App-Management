const express = require('express');
const bodyParser = require('body-parser');
const { MongoClient, ObjectId } = require('mongodb');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// MongoDB connection URI and DB name
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017';
const DB_NAME = process.env.DB_NAME || 'hr_system';

app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));

// HR Knowledge Base for Chatbot
const hrKnowledgeBase = {
  'leave policy': 'Employees are entitled to 12 days of casual leave, 10 days of sick leave, and 15 days of annual leave per year.',
  'attendance policy': 'Standard working hours are 9 AM to 6 PM. Late arrivals beyond 15 minutes will be marked as late.',
  'holidays': 'Public holidays include New Year, Independence Day, Gandhi Jayanti, Diwali, and Christmas.',
  'grievance procedure': 'Grievances can be submitted through the portal and will be reviewed within 3 business days.',
  'salary policy': 'Salaries are processed on the last working day of each month.',
  'dress code': 'Business casual attire is required. Fridays allow smart casual clothing.',
  'remote work': 'Remote work is allowed up to 2 days per week with manager approval.',
  'training programs': 'Various skill development programs are available quarterly.',
  'performance review': 'Annual performance reviews are conducted in December.',
  'benefits': 'Medical insurance, provident fund, and meal allowances are provided.'
};

// Simple chatbot response function
function getChatbotResponse(query) {
  const lowerQuery = query.toLowerCase();
  
  for (const [key, value] of Object.entries(hrKnowledgeBase)) {
    if (lowerQuery.includes(key)) {
      return value;
    }
  }
  
  // Contextual responses
  if (lowerQuery.includes('hello') || lowerQuery.includes('hi')) {
    return 'Hello! I\'m your HR Assistant. I can help you with leave policies, attendance, holidays, grievances, and more. What would you like to know?';
  }
  
  if (lowerQuery.includes('help')) {
    return 'I can assist you with: Leave Policy, Attendance Policy, Holidays, Grievance Procedure, Salary Policy, Dress Code, Remote Work, Training Programs, Performance Reviews, and Benefits. Just ask me about any of these topics!';
  }
  
  return 'I\'m sorry, I don\'t have information about that. Please try asking about leave policy, attendance, holidays, grievances, or other HR topics. Type "help" to see what I can assist with.';
}


let db;
MongoClient.connect(MONGO_URI, { useUnifiedTopology: true })
  .then(client => {
    db = client.db(DB_NAME);
    app.listen(PORT,"0.0.0.0", () => console.log(`Server running on http://localhost:${PORT}`));
  })
  .catch(err => console.error('MongoDB connection error:', err));

// Signup API
app.post('/api/signup', async (req, res) => {
  const { fullName, empId, email, password } = req.body;
  if (!fullName || !empId || !email || !password) {
    return res.status(400).json({ message: 'All fields are required.' });
  }
  // Check if empId or email already exists
  const existing = await db.collection('employees').findOne({
    $or: [{ empId }, { email }]
  });
  if (existing) {
    return res.status(409).json({ message: 'Employee ID or Email already exists.' });
  }
  // Insert new employee
  await db.collection('employees').insertOne({
    fullName,
    empId,
    email,
    password // In production, hash the password!
  });
  res.json({ message: 'Signup successful' });
});

// Login API
app.post('/api/login', async (req, res) => {
  const { empId, password } = req.body;
  if (!empId || !password) {
    return res.status(400).json({ message: 'Missing credentials' });
  }
  const user = await db.collection('employees').findOne({ empId, password });
  if (user) {
    // In production, use hashed passwords and sessions/tokens!
    res.json({ message: 'Login successful' });
  } else {
    res.status(401).json({ message: 'Invalid Employee ID or password' });
  }
});

// ...existing code...

// Leave Apply API
app.post('/api/leave/apply', async (req, res) => {
  const { empId, startDate, endDate, leaveReason } = req.body;
  if (!empId || !startDate || !endDate || !leaveReason) {
    return res.status(400).json({ message: 'All fields are required.' });
  }
  try {
    await db.collection('leave_requests').insertOne({
      empId,
      startDate,
      endDate,
      leaveReason,
      status: 'Pending',
      appliedAt: new Date()
    });
    res.json({ message: 'Leave request submitted!' });
  } catch (err) {
    res.status(500).json({ message: 'Database error' });
  }
});

// ...existing code...

// ==================== CHATBOT API ====================
// Chatbot Query API
app.post('/api/chatbot', async (req, res) => {
  const { query, empId } = req.body;
  if (!query) {
    return res.status(400).json({ message: 'Query is required.' });
  }
  
  try {
    const response = getChatbotResponse(query);
    
    // Log chat interaction for analytics
    await db.collection('chat_logs').insertOne({
      empId: empId || 'anonymous',
      query,
      response,
      timestamp: new Date()
    });
    
    res.json({ response });
  } catch (err) {
    res.status(500).json({ message: 'Chatbot error' });
  }
});

// ==================== HR ADMIN AUTHENTICATION ====================
// HR Admin Login API
app.post('/api/admin/login', async (req, res) => {
  const { adminId, password } = req.body;
  if (!adminId || !password) {
    return res.status(400).json({ message: 'Missing credentials' });
  }
  
  // Check for admin credentials (you should create admin accounts)
  const admin = await db.collection('hr_admins').findOne({ adminId, password });
  if (admin || (adminId === 'admin' && password === 'admin123')) { // Default admin
    res.json({ message: 'Admin login successful', role: 'hr_admin' });
  } else {
    res.status(401).json({ message: 'Invalid admin credentials' });
  }
});

// ==================== EMPLOYEE MANAGEMENT ====================
// Get all employees (Admin only)
app.get('/api/admin/employees', async (req, res) => {
  try {
    const employees = await db.collection('employees').find({}).toArray();
    // Remove passwords from response
    const safeEmployees = employees.map(emp => {
      const { password, ...safeEmp } = emp;
      return safeEmp;
    });
    res.json(safeEmployees);
  } catch (err) {
    res.status(500).json({ message: 'Database error' });
  }
});

// Update employee (Admin only)
app.put('/api/admin/employees/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;
    delete updateData.password; // Don't allow password updates through this API
    
    await db.collection('employees').updateOne(
      { _id: new ObjectId(id) },
      { $set: updateData }
    );
    res.json({ message: 'Employee updated successfully' });
  } catch (err) {
    res.status(500).json({ message: 'Database error' });
  }
});

// Delete employee (Admin only)
app.delete('/api/admin/employees/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await db.collection('employees').deleteOne({ _id: new ObjectId(id) });
    res.json({ message: 'Employee deleted successfully' });
  } catch (err) {
    res.status(500).json({ message: 'Database error' });
  }
});

// ==================== LEAVE MANAGEMENT (ADMIN) ====================
// Get all leave requests (Admin only)
app.get('/api/admin/leaves', async (req, res) => {
  try {
    const leaves = await db.collection('leave_requests').find({}).sort({ appliedAt: -1 }).toArray();
    res.json(leaves);
  } catch (err) {
    res.status(500).json({ message: 'Database error' });
  }
});

// Update leave request status (Admin only)
app.put('/api/admin/leaves/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { status, adminComments } = req.body;
    
    if (!['Approved', 'Rejected'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status' });
    }
    
    await db.collection('leave_requests').updateOne(
      { _id: new ObjectId(id) },
      { 
        $set: { 
          status, 
          adminComments: adminComments || '',
          reviewedAt: new Date()
        }
      }
    );
    res.json({ message: `Leave request ${status.toLowerCase()}` });
  } catch (err) {
    res.status(500).json({ message: 'Database error' });
  }
});

// ==================== ATTENDANCE MANAGEMENT ====================
// Attendance Check-in
app.post('/api/attendance/checkin', async (req, res) => {
  const { empId } = req.body;
  if (!empId) {
    return res.status(400).json({ message: 'Employee ID required' });
  }
  
  try {
    const today = new Date().toISOString().split('T')[0];
    const existingRecord = await db.collection('attendance').findOne({
      empId,
      date: today
    });
    
    if (existingRecord && existingRecord.checkIn) {
      return res.status(400).json({ message: 'Already checked in today' });
    }
    
    const checkInTime = new Date().toLocaleTimeString();
    
    if (existingRecord) {
      await db.collection('attendance').updateOne(
        { empId, date: today },
        { $set: { checkIn: checkInTime, status: 'Present' } }
      );
    } else {
      await db.collection('attendance').insertOne({
        empId,
        date: today,
        checkIn: checkInTime,
        status: 'Present'
      });
    }
    
    res.json({ time: checkInTime, message: 'Checked in successfully' });
  } catch (err) {
    res.status(500).json({ message: 'Database error' });
  }
});

// Attendance Check-out
app.post('/api/attendance/checkout', async (req, res) => {
  const { empId } = req.body;
  if (!empId) {
    return res.status(400).json({ message: 'Employee ID required' });
  }
  
  try {
    const today = new Date().toISOString().split('T')[0];
    const checkOutTime = new Date().toLocaleTimeString();
    
    const result = await db.collection('attendance').updateOne(
      { empId, date: today },
      { $set: { checkOut: checkOutTime } }
    );
    
    if (result.modifiedCount === 0) {
      return res.status(400).json({ message: 'No check-in record found for today' });
    }
    
    res.json({ time: checkOutTime, message: 'Checked out successfully' });
  } catch (err) {
    res.status(500).json({ message: 'Database error' });
  }
});

// Get today's attendance status
app.post('/api/attendance/today', async (req, res) => {
  const { empId } = req.body;
  try {
    const today = new Date().toISOString().split('T')[0];
    const record = await db.collection('attendance').findOne({
      empId,
      date: today
    });
    
    if (record) {
      res.json({
        checkedIn: !!record.checkIn,
        checkedOut: !!record.checkOut,
        checkInTime: record.checkIn,
        checkOutTime: record.checkOut
      });
    } else {
      res.json({ checkedIn: false, checkedOut: false });
    }
  } catch (err) {
    res.status(500).json({ message: 'Database error' });
  }
});

// Get all attendance records (Admin only)
app.get('/api/admin/attendance', async (req, res) => {
  try {
    const { startDate, endDate, empId } = req.query;
    let query = {};
    
    if (startDate && endDate) {
      query.date = { $gte: startDate, $lte: endDate };
    }
    if (empId) {
      query.empId = empId;
    }
    
    const attendance = await db.collection('attendance').find(query).sort({ date: -1 }).toArray();
    res.json(attendance);
  } catch (err) {
    res.status(500).json({ message: 'Database error' });
  }
});

// ==================== GRIEVANCE MANAGEMENT (ADMIN) ====================
// Get all grievances (Admin only)
app.get('/api/admin/grievances', async (req, res) => {
  try {
    const grievances = await db.collection('grievances').find({}).sort({ submittedAt: -1 }).toArray();
    res.json(grievances);
  } catch (err) {
    res.status(500).json({ message: 'Database error' });
  }
});

// Update grievance status (Admin only)
app.put('/api/admin/grievances/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { status, adminResponse } = req.body;
    
    await db.collection('grievances').updateOne(
      { _id: new ObjectId(id) },
      { 
        $set: { 
          status: status || 'Under Review',
          adminResponse: adminResponse || '',
          reviewedAt: new Date()
        }
      }
    );
    res.json({ message: 'Grievance updated successfully' });
  } catch (err) {
    res.status(500).json({ message: 'Database error' });
  }
});

// ==================== HR ANALYTICS & REPORTS ====================
// Get HR Dashboard Analytics
app.get('/api/admin/analytics', async (req, res) => {
  try {
    const totalEmployees = await db.collection('employees').countDocuments();
    const pendingLeaves = await db.collection('leave_requests').countDocuments({ status: 'Pending' });
    const openGrievances = await db.collection('grievances').countDocuments({ status: { $ne: 'Resolved' } });
    const todayAttendance = await db.collection('attendance').countDocuments({ 
      date: new Date().toISOString().split('T')[0],
      checkIn: { $exists: true }
    });
    
    // Monthly leave trends
    const monthlyLeaves = await db.collection('leave_requests').aggregate([
      {
        $group: {
          _id: { 
            month: { $month: '$appliedAt' },
            year: { $year: '$appliedAt' }
          },
          count: { $sum: 1 }
        }
      },
      { $sort: { '_id.year': -1, '_id.month': -1 } },
      { $limit: 6 }
    ]).toArray();
    
    res.json({
      totalEmployees,
      pendingLeaves,
      openGrievances,
      todayAttendance,
      monthlyLeaves
    });
  } catch (err) {
    res.status(500).json({ message: 'Database error' });
  }
});

// ==================== HIRING PROCESS MANAGEMENT ====================
// Get all hiring feedback (Admin only)
app.get('/api/admin/hiring', async (req, res) => {
  try {
    const feedback = await db.collection('hiring_feedback').find({}).sort({ submittedAt: -1 }).toArray();
    res.json(feedback);
  } catch (err) {
    res.status(500).json({ message: 'Database error' });
  }
});

// Job postings management
app.post('/api/admin/jobs', async (req, res) => {
  try {
    const { title, description, requirements, location, salary } = req.body;
    
    await db.collection('job_postings').insertOne({
      title,
      description,
      requirements,
      location,
      salary,
      status: 'Active',
      postedAt: new Date()
    });
    
    res.json({ message: 'Job posting created successfully' });
  } catch (err) {
    res.status(500).json({ message: 'Database error' });
  }
});

// Get all job postings
app.get('/api/jobs', async (req, res) => {
  try {
    const jobs = await db.collection('job_postings').find({ status: 'Active' }).toArray();
    res.json(jobs);
  } catch (err) {
    res.status(500).json({ message: 'Database error' });
  }
});

// ==================== EMPLOYEE SELF-SERVICE ====================
// Get leave balance
app.get('/api/leave/balance/:empId', async (req, res) => {
  try {
    const { empId } = req.params;
    
    // Calculate used leaves
    const approvedLeaves = await db.collection('leave_requests').find({
      empId,
      status: 'Approved'
    }).toArray();
    
    let usedCL = 0, usedSL = 0, usedPL = 0;
    
    approvedLeaves.forEach(leave => {
      const days = Math.ceil((new Date(leave.endDate) - new Date(leave.startDate)) / (1000 * 60 * 60 * 24)) + 1;
      // Simple logic - you can make this more sophisticated
      if (leave.leaveReason.toLowerCase().includes('sick')) {
        usedSL += days;
      } else if (leave.leaveReason.toLowerCase().includes('casual')) {
        usedCL += days;
      } else {
        usedPL += days;
      }
    });
    
    res.json({
      casualLeave: { total: 12, used: usedCL, remaining: 12 - usedCL },
      sickLeave: { total: 10, used: usedSL, remaining: 10 - usedSL },
      privilegeLeave: { total: 15, used: usedPL, remaining: 15 - usedPL }
    });
  } catch (err) {
    res.status(500).json({ message: 'Database error' });
  }
});

// Get employee's leave history
app.get('/api/leave/history/:empId', async (req, res) => {
  try {
    const { empId } = req.params;
    const leaves = await db.collection('leave_requests').find({ empId }).sort({ appliedAt: -1 }).toArray();
    res.json(leaves);
  } catch (err) {
    res.status(500).json({ message: 'Database error' });
  }
});

// Hiring Feedback API
app.post('/api/hiring/feedback', async (req, res) => {
  const { empId, feedback } = req.body;
  if (!empId || !feedback) {
    return res.status(400).json({ message: 'Employee ID and feedback are required.' });
  }
  try {
    await db.collection('hiring_feedback').insertOne({
      empId,
      feedback,
      submittedAt: new Date()
    });
    res.json({ message: 'Feedback submitted!' });
  } catch (err) {
    res.status(500).json({ message: 'Database error' });
  }
});

// ...existing code...

app.post('/api/grievance', async (req, res) => {
  const { empId, grievanceText } = req.body;
  if (!empId || !grievanceText) {
    return res.status(400).json({ message: 'Employee ID and grievance are required.' });
  }
  try {
    await db.collection('grievances').insertOne({
      empId,
      grievanceText,
      submittedAt: new Date()
    });
    res.json({ message: 'Grievance submitted!' });
  } catch (err) {
    res.status(500).json({ message: 'Database error' });
  }
});

// ...existing code...