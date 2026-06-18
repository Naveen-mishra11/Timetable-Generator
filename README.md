# Timetable Generator

A full-stack web application for automated timetable generation with leave management and substitution handling for educational institutions.

## 🚀 Features

### Core Functionality

- **User Authentication & Authorization**
  - Role-based access control (Admin & Teacher)
  - JWT-based secure authentication
  - Password hashing with bcryptjs

- **Subject Management**
  - Add, view, and manage subjects
  - Support for both theory and lab subjects
  - Configurable hours per week
  - Lab duration settings (1-2 periods)

- **Teacher Management**
  - Add and view teachers
  - Assign multiple subjects to teachers
  - Configure teaching type (theory/lab)
  - Set maximum consecutive teaching periods

- **Class Management**
  - Create and manage classes
  - Assign subjects to classes

- **Timetable Generation**
  - Automatic timetable generation algorithm
  - Configurable periods per day (default: 7)
  - Lunch break configuration
  - Day-wise scheduling with time slots, subjects, teachers, and rooms
  - Conflict-free scheduling

- **Teacher Timetable View**
  - Personalized timetable view for teachers
  - View assigned subjects and schedule

- **Leave Management System**
  - Teachers can apply for leave (full day or specific periods)
  - Leave requests organized by weekday
  - Admin approval/rejection workflow with comments
  - Automatic substitution generation upon leave approval

- **Substitution Management**
  - Automatic creation of substitution entries when leave is approved
  - Track substitute teacher assignments
  - Date-specific substitution handling

- **PDF Export**
  - Export timetables to PDF format
  - Professional table formatting with jsPDF

## 🛠️ Tech Stack

### Frontend
- **React 19** - UI library
- **Vite** - Build tool and development server
- **React Router v7** - Client-side routing
- **Axios** - HTTP client
- **jsPDF & jsPDF-autotable** - PDF generation
- **CSS3** - Styling

### Backend
- **Node.js** - Runtime environment
- **Express.js v5** - Web framework
- **MongoDB** - Database
- **Mongoose v8** - ODM for MongoDB
- **JWT** - Authentication tokens
- **bcryptjs** - Password hashing
- **CORS** - Cross-origin resource sharing
- **dotenv** - Environment configuration

## 📁 Project Structure

```
Timetable Generator Project/
├── backend/
│   ├── config/           # Database configuration
│   ├── controllers/      # Business logic
│   ├── middleware/       # Authentication & validation
│   ├── models/          # Mongoose schemas
│   │   ├── Class.js
│   │   ├── LeaveRequest.js
│   │   ├── Subject.js
│   │   ├── Substitution.js
│   │   ├── Teacher.js
│   │   ├── Timetable.js
│   │   └── User.js
│   ├── routes/          # API endpoints
│   ├── utils/           # Helper functions
│   ├── server.js        # Main server file
│   ├── package.json
│   └── .gitignore
│
├── frontend/
│   ├── public/          # Static assets
│   ├── src/
│   │   ├── landing_page/    # Page components
│   │   │   ├── adminHome/
│   │   │   ├── adminLeave/
│   │   │   ├── class/
│   │   │   ├── home/
│   │   │   ├── leave/
│   │   │   ├── login/
│   │   │   ├── signup/
│   │   │   ├── subject/
│   │   │   ├── teacher/
│   │   │   ├── teacherHome/
│   │   │   ├── teacherSubjects/
│   │   │   ├── teacherTimetable/
│   │   │   └── timetable/
│   │   ├── assets/      # Images, logos, etc.
│   │   ├── main.jsx     # App entry point
│   │   └── index.css    # Global styles
│   ├── index.html
│   ├── vite.config.js
│   ├── package.json
│   └── .gitignore
│
└── README.md
```

## 🚦 Getting Started

### Prerequisites

- Node.js (v18 or higher)
- MongoDB (local or MongoDB Atlas)
- npm or yarn

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/Naveen-mishra11/Timetable-Generator.git
   cd Timetable Generator Project
   ```

2. **Install Backend Dependencies**
   ```bash
   cd backend
   npm install
   ```

3. **Configure Backend Environment Variables**
   
   Copy the example environment file and configure it:
   ```bash
   cp .env.example .env
   ```
   
   Then edit `backend/.env` with your configuration:
   ```env
   PORT=5000
   MONGO_URI=mongodb://localhost:27017/timetable_generator
   JWT_SECRET=your_jwt_secret_key_here
   ```
   
   **Environment Variables Explained:**
   - `PORT`: The port on which the backend server will run (default: 5000)
   - `MONGO_URI`: MongoDB connection string
     - For local MongoDB: `mongodb://localhost:27017/timetable_generator`
     - For MongoDB Atlas: `mongodb+srv://<username>:<password>@cluster.mongodb.net/timetable_generator?retryWrites=true&w=majority`
   - `JWT_SECRET`: Secret key for JWT token generation (use a strong random string in production)
     - Generate one using: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`

4. **Configure Frontend Environment Variables**
   
   Copy the example environment file:
   ```bash
   cd ../frontend
   cp .env.example .env
   ```
   
   The default configuration should work for local development:
   ```env
   VITE_SERVER_URL=http://localhost:5000
   ```
   
   For production deployment, update `VITE_SERVER_URL` with your deployed backend URL.

5. **Install Frontend Dependencies**
   ```bash
   npm install
   ```

### Running the Application

1. **Start the Backend Server**
   ```bash
   cd backend
   npm run dev
   ```
   The server will run on `http://localhost:5000`

2. **Start the Frontend Development Server** (in a new terminal)
   ```bash
   cd frontend
   npm run dev
   ```
   The frontend will run on `http://localhost:5173` (or the port shown in terminal)

3. **Access the Application**
   Open your browser and navigate to `http://localhost:5173`

## 📱 API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - User login

### Subjects
- `GET /api/subjects` - Get all subjects
- `POST /api/subjects` - Create new subject
- `PUT /api/subjects/:id` - Update subject
- `DELETE /api/subjects/:id` - Delete subject

### Teachers
- `GET /api/teachers` - Get all teachers
- `POST /api/teachers` - Create new teacher
- `PUT /api/teachers/:id` - Update teacher
- `DELETE /api/teachers/:id` - Delete teacher

### Classes
- `GET /api/classes` - Get all classes
- `POST /api/classes` - Create new class
- `PUT /api/classes/:id` - Update class
- `DELETE /api/classes/:id` - Delete class

### Timetable
- `GET /api/timetable` - Get all timetables
- `POST /api/timetable/generate` - Generate timetable
- `GET /api/timetable/:className` - Get timetable for specific class
- `PUT /api/timetable/:id` - Update timetable
- `DELETE /api/timetable/:id` - Delete timetable

### Teacher Timetable
- `GET /api/teacher-timetable/:teacherId` - Get teacher's timetable

### Leave Management
- `GET /api/leaves` - Get all leave requests (admin)
- `POST /api/leaves` - Apply for leave (teacher)
- `PUT /api/leaves/:id/approve` - Approve leave request
- `PUT /api/leaves/:id/reject` - Reject leave request

### Substitutions
- `GET /api/leaves/:leaveId/substitutions` - Get substitutions for a leave
- `PUT /api/leaves/:leaveId/substitutions/:subId` - Assign substitute teacher

### Users
- `GET /api/users` - Get all users (admin)
- `GET /api/users/:id` - Get user profile

## 👥 User Roles

### Admin
- Full access to all features
- Can manage subjects, teachers, and classes
- Can generate and view all timetables
- Can approve/reject leave requests
- Can manage substitutions

### Teacher
- View personal timetable
- View assigned subjects
- Apply for leave
- View leave history

## 🎯 Key Features Explained

### Timetable Generation Algorithm
The system uses a constraint-based algorithm that considers:
- Teacher availability and workload
- Subject hours per week requirements
- Lab duration requirements
- Maximum consecutive periods per teacher
- Room assignments
- Lunch break scheduling

### Leave & Substitution System
When a teacher applies for leave:
1. Admin reviews and approves/rejects the request
2. Upon approval, the system automatically creates substitution entries
3. Admin can assign substitute teachers for affected periods
4. The system maintains a record of all substitutions

### PDF Export
Timetables can be exported to PDF format with:
- Professional table layout
- Clear formatting
- Easy printing and sharing

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 License

ISC License - see LICENSE file for details

## 👨‍💻 Author

**Naveen Mishra**

## 🙏 Acknowledgments

- React team for the amazing UI library
- Express.js team for the robust backend framework
- MongoDB for the flexible database
- All open-source contributors

## 📞 Support

For support, email naveenmis2004@gmail.com or open an issue in the repository.

---

**Happy Timetabling! 📚⏰**
