import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import connectDB from "./src/config/database.js";
import authRoutes from "./src/routes/auth.js";
import employeeRoutes from "./src/routes/employee.js";
import payrollRoutes from "./src/routes/payroll.js";
import dashboardRoutes from "./src/routes/dashboard.js";

dotenv.config();

const app = express();

// Connect to MongoDB
connectDB();

// Middleware
app.use(cors());
app.use(express.json());

// Debug middleware to log all requests
app.use((req, res, next) => {
  console.log(`${req.method} ${req.path}`);
  next();
});

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/employee", employeeRoutes);
app.use("/api/payroll", payrollRoutes);
app.use("/api/dashboard", dashboardRoutes);

// Test Route
app.get("/", (req, res) => {
  res.send("Employee Payroll Backend Running");
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({ success: false, message: 'Internal server error' });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log('Routes mounted:');
  console.log('  /api/auth - auth routes');
  console.log('  /api/employee - employee routes');
  console.log('  /api/payroll - payroll routes');
  console.log('  /api/dashboard - dashboard routes');
});
