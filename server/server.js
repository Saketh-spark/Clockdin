const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const cron = require('node-cron');
const nodemailer = require('nodemailer');
const fs = require('fs');
const path = require('path');
require('dotenv').config();
const Reminder = require('./models/reminder.model');
const Event = require('./models/event.model');
const User = require('./models/user.model'); // Import User model
const { rescheduleAll, scheduleBookmarkedNotifications, scheduleEventNotifications } = require('./utils/scheduler');
const reminders = require('./routes/reminders');

const app = express();
app.use(cors());
app.use(express.json());

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.error('MongoDB error:', err));

// Setup nodemailer transporter (use your SMTP credentials)
const transporter = nodemailer.createTransport({
  service: 'gmail', // or your email provider
  auth: {
    user: process.env.EMAIL_USER, // set in .env
    pass: process.env.EMAIL_PASS  // set in .env
  }
});

// Cron job: runs every 1 minute
cron.schedule('* * * * *', async () => {
  const now = new Date();
  console.log(`Cron job triggered at: ${now}`);

  try {
    // Find reminders not sent and due
    const reminders = await Reminder.find({ sent: false, remindAt: { $lte: now } }).populate('event');
    console.log(`Reminders found: ${reminders.length}`);

    for (const reminder of reminders) {
      console.log(`Processing reminder for email: ${reminder.email}, event: ${reminder.event.title}`);
      // Send email
      try {
        await transporter.sendMail({
          from: process.env.EMAIL_USER,
          to: reminder.email,
          subject: `Event Reminder: ${reminder.event.title}`,
          text: `Hi! This is a reminder for the event \"${reminder.event.title}\" happening on ${reminder.event.eventDate?.toLocaleDateString()}.`
        });
        // Mark as sent
        reminder.sent = true;
        await reminder.save();
        console.log(`Reminder sent to ${reminder.email} for event ${reminder.event.title}`);
      } catch (err) {
        console.error(`Error sending reminder to ${reminder.email}:`, err);
      }
    }
  } catch (err) {
    console.error('Error finding reminders:', err);
  }
});

// Corrected the logic to ensure notifications are sent only for events ending exactly in 2 days
function scheduleEventsEndingSoonCron() {
  cron.schedule('* * * * *', async () => {
    const today = new Date();
    const twoDaysLater = new Date(today);
    twoDaysLater.setDate(today.getDate() + 2);
    console.log(`Cron job for events ending soon triggered at: ${today}`);

    try {
      // Fetch all user emails
      const users = await User.find({}, 'email');
      const allEmails = users.map(user => user.email);

      // Find events ending exactly in 2 days
      const startOfDay = new Date(twoDaysLater);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(twoDaysLater);
      endOfDay.setHours(23, 59, 59, 999);

      const eventsEndingSoon = await Event.find({
        deadline: { $gte: startOfDay, $lte: endOfDay },
        notificationSent: false
      });
      console.log(`Events ending soon found: ${eventsEndingSoon.length}`);

      for (const event of eventsEndingSoon) {
        console.log(`Processing event: ${event.title}`);

        // Ensure usersToNotify is populated
        if (!event.usersToNotify || event.usersToNotify.length === 0) {
          event.usersToNotify = allEmails;
        }

        // Send notification to users
        const notificationMessage = `The event \"${event.title}\" is ending on ${event.deadline.toLocaleDateString()}. Register now!\nDetails: ${event.description}`;

        for (const userEmail of event.usersToNotify) {
          console.log(`Sending notification to: ${userEmail}`);
          try {
            await transporter.sendMail({
              from: process.env.EMAIL_USER,
              to: userEmail,
              subject: `Event Ending Soon: ${event.title}`,
              text: notificationMessage
            });
            console.log(`Notification sent to ${userEmail} for event ${event.title}`);
          } catch (err) {
            console.error(`Error sending notification to ${userEmail}:`, err);
          }
        }

        // Mark event as notification sent and persist
        event.notificationSent = true;
        await event.save();
      }
    } catch (err) {
      console.error('Error finding events ending soon or fetching users:', err);
    }
  });
}

// Setup logging
const logsDir = path.join(__dirname, 'logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}
const logFilePath = path.join(logsDir, 'server.log');
const logStream = fs.createWriteStream(logFilePath, { flags: 'a' });

function logMessage(message) {
  const timestamp = new Date().toISOString();
  logStream.write(`[${timestamp}] ${message}\n`);
}

// Middleware to log requests
app.use((req, res, next) => {
  logMessage(`Incoming request: ${req.method} ${req.url}`);
  next();
});

// Log errors
app.use((err, req, res, next) => {
  logMessage(`Error: ${err.message}`);
  next(err);
});

// Routes
app.use('/api/users', require('./routes/users'));
app.use('/api/chatbot', require('./routes/chatbot'));
app.use('/api/events', require('./routes/events'));
app.use('/api/reminders', reminders);
app.use('/api/auth', require('./routes/auth'));
app.use('/api/reminders/bookmark-notifications', require('./routes/reminders'));

const PORT = 5000;
app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));

// Initialize passport Google strategy only when credentials are provided
const passport = require('passport');
if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  try {
    require('./config/passportGoogle')(passport);
    app.use(passport.initialize());
  } catch (err) {
    console.error('Failed to initialize Google passport strategy:', err.message);
  }
} else {
  console.log('Google OAuth not configured; skipping passport Google strategy initialization.');
}

// Function to add hardcoded events to the database
const addHardcodedEventsToDatabase = async () => {
  const hardcodedEvents = [
  // Hackathons (20)
  {
    title: 'Smart India Hackathon 2025',
    deadline: new Date('2025-10-10'),
    description: 'A nationwide initiative to provide students with a platform to solve pressing problems of ministries and industries. Teams work on real-world problems and present innovative solutions.',
    usersToNotify: [],
    notificationSent: false
  },
  {
    title: 'Flipkart GRiD 6.0',
    deadline: new Date('2025-10-10'),
    description: "Flipkart's flagship engineering campus challenge for students to solve real-world business and technical problems faced by Flipkart.",
    usersToNotify: [],
    notificationSent: false
  },
  {
    title: 'Code for Good 2025 by JPMorgan Chase',
    deadline: new Date('2025-09-20'),
    description: 'A social good hackathon where students collaborate to build solutions for non-profit organizations. Open to engineering students across India.',
    usersToNotify: [],
    notificationSent: false
  },
  {
    title: 'Microsoft Imagine Cup India 2025',
    deadline: new Date('2025-11-10'),
    description: 'A global student technology competition where teams build innovative projects using Microsoft technologies. National finals held in India.',
    usersToNotify: [],
    notificationSent: false
  },
  {
    title: 'Tata Crucible Hackathon 2025',
    deadline: new Date('2025-10-15'),
    description: 'A national-level hackathon by Tata Group for students to solve business and social challenges. Attractive prizes and internship opportunities.',
    usersToNotify: [],
    notificationSent: false
  },
  {
    title: 'TechGig Code Gladiators 2025',
    deadline: new Date('2025-11-10'),
    description: "India's biggest coding competition with multiple hackathon themes and cash prizes. Open to all students and professionals.",
    usersToNotify: [],
    notificationSent: false
  },
  {
    title: 'IIT Roorkee Cognizance Hackathon',
    deadline: new Date('2025-10-05'),
    description: "Annual hackathon as part of Cognizance, IIT Roorkee's technical fest. Solve real-world challenges and win exciting prizes.",
    usersToNotify: [],
    notificationSent: false
  },
  {
    title: 'IIT Bombay E-Yantra Hackathon',
    deadline: new Date('2025-10-20'),
    description: 'A national robotics competition for engineering students, focusing on embedded systems and robotics.',
    usersToNotify: [],
    notificationSent: false
  },
  {
    title: 'Google Solution Challenge India',
    deadline: new Date('2025-11-25'),
    description: 'Build solutions for local community problems using Google technologies. Open to all Google Developer Student Clubs members.',
    usersToNotify: [],
    notificationSent: false
  },
  {
    title: 'HackRx 5.0 by Bajaj Finserv',
    deadline: new Date('2025-10-10'),
    description: 'A national hackathon for students to solve fintech challenges and win prizes and internships at Bajaj Finserv.',
    usersToNotify: [],
    notificationSent: false
  },
  {
    title: 'Campus CodeSprint 1',
    deadline: new Date('2025-10-25'),
    description: 'A campus-wide hackathon for Indian students to solve real-world tech problems. Prizes and internship opportunities available.',
    usersToNotify: [],
    notificationSent: false
  },
  {
    title: 'Campus CodeSprint 2',
    deadline: new Date('2025-10-26'),
    description: 'A campus-wide hackathon for Indian students to solve real-world tech problems. Prizes and internship opportunities available.',
    usersToNotify: [],
    notificationSent: false
  },
  {
    title: 'Campus CodeSprint 3',
    deadline: new Date('2025-10-27'),
    description: 'A campus-wide hackathon for Indian students to solve real-world tech problems. Prizes and internship opportunities available.',
    usersToNotify: [],
    notificationSent: false
  },
  {
    title: 'Campus CodeSprint 4',
    deadline: new Date('2025-10-28'),
    description: 'A campus-wide hackathon for Indian students to solve real-world tech problems. Prizes and internship opportunities available.',
    usersToNotify: [],
    notificationSent: false
  },
  {
    title: 'Campus CodeSprint 5',
    deadline: new Date('2025-10-29'),
    description: 'A campus-wide hackathon for Indian students to solve real-world tech problems. Prizes and internship opportunities available.',
    usersToNotify: [],
    notificationSent: false
  },
  {
    title: 'Campus CodeSprint 6',
    deadline: new Date('2025-10-30'),
    description: 'A campus-wide hackathon for Indian students to solve real-world tech problems. Prizes and internship opportunities available.',
    usersToNotify: [],
    notificationSent: false
  },
  {
    title: 'Campus CodeSprint 7',
    deadline: new Date('2025-10-31'),
    description: 'A campus-wide hackathon for Indian students to solve real-world tech problems. Prizes and internship opportunities available.',
    usersToNotify: [],
    notificationSent: false
  },
  {
    title: 'Campus CodeSprint 8',
    deadline: new Date('2025-11-01'),
    description: 'A campus-wide hackathon for Indian students to solve real-world tech problems. Prizes and internship opportunities available.',
    usersToNotify: [],
    notificationSent: false
  },
  {
    title: 'Campus CodeSprint 9',
    deadline: new Date('2025-11-02'),
    description: 'A campus-wide hackathon for Indian students to solve real-world tech problems. Prizes and internship opportunities available.',
    usersToNotify: [],
    notificationSent: false
  },
  {
    title: 'Campus CodeSprint 10',
    deadline: new Date('2025-11-03'),
    description: 'A campus-wide hackathon for Indian students to solve real-world tech problems. Prizes and internship opportunities available.',
    usersToNotify: [],
    notificationSent: false
  },

  // Internships (11)
  {
    title: 'ISRO Student Internship 2025',
    deadline: new Date('2025-10-31'),
    description: 'Internship opportunity at ISRO for Indian students in engineering, science, and management disciplines.',
    usersToNotify: [],
    notificationSent: false
  },
  {
    title: 'DRDO Research Internship 2025',
    deadline: new Date('2025-10-15'),
    description: 'Internship at Defence Research and Development Organisation for engineering and science students.',
    usersToNotify: [],
    notificationSent: false
  },
  {
    title: 'IIT Madras Summer Internship',
    deadline: new Date('2025-09-30'),
    description: 'Research internship at IIT Madras for undergraduate and postgraduate students.',
    usersToNotify: [],
    notificationSent: false
  },
  {
    title: 'TCS Internship Program',
    deadline: new Date('2025-09-20'),
    description: 'Internship at Tata Consultancy Services for students in computer science and related fields.',
    usersToNotify: [],
    notificationSent: false
  },
  {
    title: 'Google STEP Internship India',
    deadline: new Date('2025-10-01'),
    description: 'STEP (Student Training in Engineering Program) internship for first and second-year undergraduate students.',
    usersToNotify: [],
    notificationSent: false
  },
  {
    title: 'Microsoft Research India Internship',
    deadline: new Date('2025-11-01'),
    description: 'Research internship at Microsoft Research India for students in computer science and related fields.',
    usersToNotify: [],
    notificationSent: false
  },
  {
    title: 'Amazon India SDE Internship',
    deadline: new Date('2025-09-25'),
    description: 'Software Development Engineer internship for students in computer science and related fields.',
    usersToNotify: [],
    notificationSent: false
  },
  {
    title: 'Wipro Internship Program',
    deadline: new Date('2025-10-10'),
    description: 'Internship for engineering and management students at Wipro India.',
    usersToNotify: [],
    notificationSent: false
  },
  {
    title: 'Infosys InStep Internship',
    deadline: new Date('2025-10-20'),
    description: 'Global internship program for students at Infosys campuses in India.',
    usersToNotify: [],
    notificationSent: false
  },
  {
    title: 'Internshala Student Internship Fair',
    deadline: new Date('2025-10-25'),
    description: "India's largest internship fair with 1000+ companies offering internships across domains.",
    usersToNotify: [],
    notificationSent: false
  },
  {
    title: 'Top Indian Tech Internship 1',
    deadline: new Date('2025-10-25'),
    description: 'Internship opportunity 1 at leading Indian tech companies for engineering and management students.',
    usersToNotify: [],
    notificationSent: false
  },

  // Workshops (11)
  {
    title: 'AI/ML Workshop by IIT Bombay',
    deadline: new Date('2025-09-25'),
    description: 'Hands-on workshop on Artificial Intelligence and Machine Learning by IIT Bombay faculty. Includes practical sessions and project work.',
    usersToNotify: [],
    notificationSent: false
  },
  {
    title: 'Web Development Bootcamp by Coding Ninjas',
    deadline: new Date('2025-10-10'),
    description: 'A 2-day intensive bootcamp covering HTML, CSS, JavaScript, and React for beginners and intermediates.',
    usersToNotify: [],
    notificationSent: false
  },
  {
    title: 'Robotics Workshop by IIT Delhi',
    deadline: new Date('2025-10-25'),
    description: 'Workshop on robotics, automation, and embedded systems for engineering students.',
    usersToNotify: [],
    notificationSent: false
  },
  {
    title: 'Cloud Computing Workshop by NPTEL',
    deadline: new Date('2025-11-20'),
    description: 'Workshop on cloud computing concepts, AWS, and Azure for students and professionals.',
    usersToNotify: [],
    notificationSent: false
  },
  {
    title: 'Data Science Workshop by Analytics Vidhya',
    deadline: new Date('2025-10-10'),
    description: 'A hands-on workshop on data science, Python, and machine learning for students.',
    usersToNotify: [],
    notificationSent: false
  },
  {
    title: 'Cybersecurity Workshop by NASSCOM',
    deadline: new Date('2025-11-10'),
    description: 'Learn the basics of cybersecurity, ethical hacking, and network security.',
    usersToNotify: [],
    notificationSent: false
  },
  {
    title: 'Blockchain Workshop by IIT Kharagpur',
    deadline: new Date('2025-11-30'),
    description: 'Workshop on blockchain technology, smart contracts, and decentralized apps.',
    usersToNotify: [],
    notificationSent: false
  },
  {
    title: 'Python Programming Bootcamp by Coding Blocks',
    deadline: new Date('2025-10-20'),
    description: 'A beginner-friendly bootcamp on Python programming and problem solving.',
    usersToNotify: [],
    notificationSent: false
  },
  {
    title: 'IoT Workshop by NIT Trichy',
    deadline: new Date('2025-11-01'),
    description: 'Workshop on Internet of Things (IoT) and its applications in real life.',
    usersToNotify: [],
    notificationSent: false
  },
  {
    title: 'Full Stack Development Workshop by GeeksforGeeks',
    deadline: new Date('2025-11-25'),
    description: 'Workshop on full stack web development using MERN stack.',
    usersToNotify: [],
    notificationSent: false
  },
  {
    title: 'Skill Workshop 1',
    deadline: new Date('2025-11-20'),
    description: 'Skill development workshop 1 for Indian students on trending technologies.',
    usersToNotify: [],
    notificationSent: false
  },

  // Competitions (20)
  {
    title: 'ACM ICPC India Regional 2025',
    deadline: new Date('2025-11-10'),
    description: "The world's most prestigious programming contest for university students. Regional round for Indian teams.",
    usersToNotify: [],
    notificationSent: false
  },
  {
    title: 'TCS CodeVita Season 14',
    deadline: new Date('2025-11-10'),
    description: 'A global coding competition by TCS for students to solve algorithmic problems.',
    usersToNotify: [],
    notificationSent: false
  },
  {
    title: 'Infosys InfyTQ Competition',
    deadline: new Date('2025-10-10'),
    description: 'National coding competition by Infosys for engineering students.',
    usersToNotify: [],
    notificationSent: false
  },
  {
    title: 'Google Code Jam India',
    deadline: new Date('2025-09-20'),
    description: 'Google Code Jam regional round for India. Solve challenging algorithmic problems.',
    usersToNotify: [],
    notificationSent: false
  },
  {
    title: 'IIT Kanpur Techkriti Olympiad',
    deadline: new Date('2025-10-05'),
    description: 'National-level olympiad for school and college students as part of Techkriti, IIT Kanpur.',
    usersToNotify: [],
    notificationSent: false
  },
  {
    title: 'CodeChef SnackDown 2025',
    deadline: new Date('2025-11-01'),
    description: 'Global programming competition by CodeChef. Open to all students.',
    usersToNotify: [],
    notificationSent: false
  },
  {
    title: 'IIT Bombay Techfest Competitions',
    deadline: new Date('2025-12-01'),
    description: 'Multiple technical competitions as part of Techfest, IIT Bombay.',
    usersToNotify: [],
    notificationSent: false
  },
  {
    title: 'HackerEarth India Coding Challenge',
    deadline: new Date('2025-10-20'),
    description: 'Monthly coding challenge for Indian students and professionals.',
    usersToNotify: [],
    notificationSent: false
  },
  {
    title: 'IIT Delhi Tryst Competitions',
    deadline: new Date('2025-10-25'),
    description: 'Technical competitions as part of Tryst, IIT Delhi’s annual tech fest.',
    usersToNotify: [],
    notificationSent: false
  },
  {
    title: 'Unstop National Coding League',
    deadline: new Date('2025-11-25'),
    description: 'National-level coding competition for students across India.',
    usersToNotify: [],
    notificationSent: false
  },
  {
    title: 'National Competition 1',
    deadline: new Date('2025-10-25'),
    description: 'National level competition 1 for Indian students on coding, business, or innovation.',
    usersToNotify: [],
    notificationSent: false
  },
  {
    title: 'National Competition 2',
    deadline: new Date('2025-10-26'),
    description: 'National level competition 2 for Indian students on coding, business, or innovation.',
    usersToNotify: [],
    notificationSent: false
  },
  {
    title: 'National Competition 3',
    deadline: new Date('2025-10-27'),
    description: 'National level competition 3 for Indian students on coding, business, or innovation.',
    usersToNotify: [],
    notificationSent: false
  },
  {
    title: 'National Competition 4',
    deadline: new Date('2025-10-28'),
    description: 'National level competition 4 for Indian students on coding, business, or innovation.',
    usersToNotify: [],
    notificationSent: false
  },
  {
    title: 'National Competition 5',
    deadline: new Date('2025-10-29'),
    description: 'National level competition 5 for Indian students on coding, business, or innovation.',
    usersToNotify: [],
    notificationSent: false
  },
  {
    title: 'National Competition 6',
    deadline: new Date('2025-10-30'),
    description: 'National level competition 6 for Indian students on coding, business, or innovation.',
    usersToNotify: [],
    notificationSent: false
  },
  {
    title: 'National Competition 7',
    deadline: new Date('2025-10-31'),
    description: 'National level competition 7 for Indian students on coding, business, or innovation.',
    usersToNotify: [],
    notificationSent: false
  },
  {
    title: 'National Competition 8',
    deadline: new Date('2025-11-01'),
    description: 'National level competition 8 for Indian students on coding, business, or innovation.',
    usersToNotify: [],
    notificationSent: false
  },
  {
    title: 'National Competition 9',
    deadline: new Date('2025-11-02'),
    description: 'National level competition 9 for Indian students on coding, business, or innovation.',
    usersToNotify: [],
    notificationSent: false
  },
  {
    title: 'National Competition 10',
    deadline: new Date('2025-11-03'),
    description: 'National level competition 10 for Indian students on coding, business, or innovation.',
    usersToNotify: [],
    notificationSent: false
  },

  // Seminars (20)
  {
    title: 'IEEE Seminar on Quantum Computing',
    deadline: new Date('2025-10-05'),
    description: 'A seminar on the basics and applications of quantum computing, organized by IEEE India.',
    usersToNotify: [],
    notificationSent: false
  },
  {
    title: 'NPTEL Seminar: Data Science Trends',
    deadline: new Date('2025-09-20'),
    description: 'Seminar on the latest trends in data science and analytics by NPTEL.',
    usersToNotify: [],
    notificationSent: false
  },
  {
    title: 'AICTE Seminar on EdTech',
    deadline: new Date('2025-11-10'),
    description: 'Seminar on educational technology and digital learning by AICTE.',
    usersToNotify: [],
    notificationSent: false
  },
  {
    title: 'DST Seminar on Innovation',
    deadline: new Date('2025-12-01'),
    description: 'Seminar on innovation and entrepreneurship by Department of Science & Technology.',
    usersToNotify: [],
    notificationSent: false
  },
  {
    title: 'IIT Madras Seminar on AI',
    deadline: new Date('2025-10-10'),
    description: 'Seminar on Artificial Intelligence and its applications by IIT Madras.',
    usersToNotify: [],
    notificationSent: false
  },
  {
    title: 'IIT Bombay Seminar on Robotics',
    deadline: new Date('2025-11-01'),
    description: 'Seminar on robotics and automation by IIT Bombay.',
    usersToNotify: [],
    notificationSent: false
  },
  {
    title: 'NIT Trichy Seminar on IoT',
    deadline: new Date('2025-11-25'),
    description: 'Seminar on Internet of Things and its future by NIT Trichy.',
    usersToNotify: [],
    notificationSent: false
  },
  {
    title: 'IIT Kharagpur Seminar on Blockchain',
    deadline: new Date('2025-10-20'),
    description: 'Seminar on blockchain technology and its applications by IIT Kharagpur.',
    usersToNotify: [],
    notificationSent: false
  },
  {
    title: 'IIT Delhi Seminar on Cybersecurity',
    deadline: new Date('2025-10-25'),
    description: 'Seminar on cybersecurity and ethical hacking by IIT Delhi.',
    usersToNotify: [],
    notificationSent: false
  },
  {
    title: 'GeeksforGeeks Seminar on Full Stack',
    deadline: new Date('2025-12-10'),
    description: 'Seminar on full stack development and career opportunities.',
    usersToNotify: [],
    notificationSent: false
  },
  {
    title: 'Student Seminar 1',
    deadline: new Date('2025-11-20'),
    description: 'Educational seminar 1 for Indian students on trending topics in technology and science.',
    usersToNotify: [],
    notificationSent: false
  },
  {
    title: 'Student Seminar 2',
    deadline: new Date('2025-11-21'),
    description: 'Educational seminar 2 for Indian students on trending topics in technology and science.',
    usersToNotify: [],
    notificationSent: false
  },
  {
    title: 'Student Seminar 3',
    deadline: new Date('2025-11-22'),
    description: 'Educational seminar 3 for Indian students on trending topics in technology and science.',
    usersToNotify: [],
    notificationSent: false
  },
  {
    title: 'Student Seminar 4',
    deadline: new Date('2025-11-23'),
    description: 'Educational seminar 4 for Indian students on trending topics in technology and science.',
    usersToNotify: [],
    notificationSent: false
  },
  {
    title: 'Student Seminar 5',
    deadline: new Date('2025-11-24'),
    description: 'Educational seminar 5 for Indian students on trending topics in technology and science.',
    usersToNotify: [],
    notificationSent: false
  },
  {
    title: 'Student Seminar 6',
    deadline: new Date('2025-11-25'),
    description: 'Educational seminar 6 for Indian students on trending topics in technology and science.',
    usersToNotify: [],
    notificationSent: false
  },
  {
    title: 'Student Seminar 7',
    deadline: new Date('2025-11-26'),
    description: 'Educational seminar 7 for Indian students on trending topics in technology and science.',
    usersToNotify: [],
    notificationSent: false
  },
  {
    title: 'Student Seminar 8',
    deadline: new Date('2025-11-27'),
    description: 'Educational seminar 8 for Indian students on trending topics in technology and science.',
    usersToNotify: [],
    notificationSent: false
  },
  {
    title: 'Student Seminar 9',
    deadline: new Date('2025-11-28'),
    description: 'Educational seminar 9 for Indian students on trending topics in technology and science.',
    usersToNotify: [],
    notificationSent: false
  },
  {
    title: 'Student Seminar 10',
    deadline: new Date('2025-11-29'),
    description: 'Educational seminar 10 for Indian students on trending topics in technology and science.',
    usersToNotify: [],
    notificationSent: false
  },
  {
    title: 'Bookmarked Eventtt',
    deadline: new Date('2025-12-13'),
    description: 'Educational seminar 10 for Indian students on trending topics in technology and science.',
    usersToNotify: [],
    notificationSent: false
  },
  {
    title: 'sample event',
    deadline: new Date('2025-12-13'),
    description: 'Educational seminar 10 for Indian students on trending topics in technology and science.',
    usersToNotify: [],
    notificationSent: false
  },
  {
    title: 'sample event 2',
    deadline: new Date('2025-12-18'),
    description: 'Educational seminar 10 for Indian students on trending topics in technology and science.',
    usersToNotify: [],
    notificationSent: false
  },
];

  for (const eventData of hardcodedEvents) {
    try {
      const existingEvent = await Event.findOne({ title: eventData.title });

      if (!existingEvent) {
        // If the event does not exist, create it with the hardcoded data
        await Event.create(eventData);
        console.log(`Added event to database: ${eventData.title}`);
      } else {
        // If the event exists, check if the deadline has changed
        // Mongoose dates can be tricky to compare directly, convert to time
        if (existingEvent.deadline.getTime() !== eventData.deadline.getTime()) {
          console.log(`Deadline for "${eventData.title}" has changed. Updating and resetting notification status.`);
          existingEvent.deadline = eventData.deadline;
          existingEvent.description = eventData.description;
          // Reset notificationSent to false since the deadline changed
          existingEvent.notificationSent = false; 
        } else {
          // If deadline is the same, just ensure description is up-to-date
          existingEvent.description = eventData.description;
        }
        
        await existingEvent.save();
        console.log(`Ensured event is up-to-date in database: ${eventData.title}`);
      }
    } catch (error) {
      console.error(`Error ensuring event ${eventData.title} is in database:`, error);
    }
  }
};

// Call the function to add hardcoded events to the database, then start the events cron
addHardcodedEventsToDatabase()
  .then(() => {
    // Now that hardcoded events are persisted (if missing), schedule the events cron
    scheduleEventsEndingSoonCron();
    console.log('Hardcoded events ensured and events cron scheduled.');
  })
  .catch(err => console.error('Error adding hardcoded events to DB:', err));

// Initialize and schedule jobs
addHardcodedEventsToDatabase();
rescheduleAll();
scheduleBookmarkedNotifications();
scheduleEventNotifications(); // Schedule daily event notifications

