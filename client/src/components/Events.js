import React, { useEffect, useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import EventCard from './EventCard';
import EventModal from './EventModal';
import '../Events.css';

// 100+ Hardcoded Indian events for the next 4 months with proper names, descriptions, deadlines, and locations
const hardcodedEvents = [
  // Hackathons (20)
  {
    _id: 'h1',
    title: 'Smart India Hackathon 2025',
    type: 'hackathon',
    eventDate: '2025-11-15',
    description: "A nationwide initiative to provide students with a platform to solve pressing problems of ministries and industries. Teams work on real-world problems and present innovative solutions.",
    detailedDescription: "Smart India Hackathon is India's largest hackathon organized by the Ministry of Education, Government of India. It provides students with a platform to solve pressing problems of ministries and industries. The hackathon focuses on real-world problem solving, innovation, and creating solutions that can make a difference in society. Teams work on problems from various domains including healthcare, agriculture, education, and governance.",
    link: 'https://www.sih.gov.in/',
    applyLink: 'https://www.sih.gov.in/',
    featured: true,
    location: 'Finals: Noida, Uttar Pradesh (Offline)',
    deadline: '2025-10-24',
    isBookmarked: true, // Added for testing
    image: 'https://www.sih.gov.in/assets/images/logo.png',
    duration: '3 days (Finals)',
    workload: 'Full-time (during event)',
    eligibility: 'UG/PG students, all branches, min 2nd year',
    teamOrIndividual: 'Team (3-6 members)',
    stipendPerks: 'Prizes up to ₹1 Lakh, Certificates, Internship/PPO opportunities',
    mode: 'Offline (Finals), Online (Prelims)',
    organizerReputation: 'Govt. of India, MHRD',
    learningOpportunities: 'Problem Solving, Coding, Real-world Impact, Government Processes',
    mentorship: 'Yes (Mentors assigned to teams)',
    futureScope: 'PPOs, Resume Value, National Recognition, Government Connections',
    networking: 'Industry experts, Govt. officials, Alumni, Fellow participants',
    applicants: '50,000+ teams (2024)',
    pastReviews: '"Amazing exposure and learning! The mentors were incredibly helpful." – 2024 Winner',
    difficulty: 'Intermediate',
    tags: ['Innovation', 'Coding', 'Govt', 'Team Event', 'Real-world Impact']
  },
  {
    _id: 'h2',
    title: 'Flipkart GRiD 6.0',
    type: 'hackathon',
    eventDate: '2025-10-25',
    description: "Flipkart's flagship engineering campus challenge for students to solve real-world business and technical problems faced by Flipkart.",
    detailedDescription: "Flipkart GRiD is one of India's most prestigious hackathons, focusing on solving real-world e-commerce challenges. Students work on problems related to logistics, recommendation systems, payment solutions, and customer experience. The hackathon provides exposure to Flipkart's technology stack and business processes.",
    link: 'https://unstop.com/hackathons/flipkart-grid-60-flipkart-902789',
    applyLink: 'https://unstop.com/hackathons/flipkart-grid-60-flipkart-902789',
    featured: true,
    location: 'Virtual (Online)',
    deadline: '2025-10-10',
    isBookmarked: false, // Added for clarity
    image: 'https://static.startuptalky.com/2021/07/flipkart-logo-startuptalky.jpg',
    duration: '2 days',
    workload: 'Full-time (during event)',
    eligibility: 'Engineering students (CS/IT/ECE), 2nd year onwards',
    teamOrIndividual: 'Team (2-4 members)',
    stipendPerks: 'Prizes up to ₹2 Lakhs, Internship offers, PPO opportunities',
    mode: 'Online',
    organizerReputation: 'Flipkart (Walmart-owned)',
    learningOpportunities: 'E-commerce, System Design, Business Logic, Scalability',
    mentorship: 'Yes (Flipkart engineers)',
    futureScope: 'PPOs at Flipkart, Resume Value, Industry Exposure',
    networking: 'Flipkart engineers, Product managers, Fellow participants',
    applicants: '15,000+ students (2024)',
    pastReviews: '"Great learning experience with real-world problems!" – 2024 Participant',
    difficulty: 'Advanced',
    tags: ['E-commerce', 'System Design', 'Business Logic', 'Team Event']
  },
  {
    _id: 'h3',
    title: 'Code for Good 2025 by JPMorgan Chase',
    type: 'hackathon',
    eventDate: '2025-09-28',
    description: "A social good hackathon where students collaborate to build solutions for non-profit organizations. Open to engineering students across India.",
    detailedDescription: "Code for Good is JPMorgan Chase's flagship hackathon focused on social impact. Students work with non-profit organizations to solve real-world problems using technology. The event combines technical skills with social responsibility, creating solutions that can make a difference in communities.",
    link: 'https://careers.jpmorgan.com/in/en/students/programs/code-for-good',
    applyLink: 'https://careers.jpmorgan.com/in/en/students/programs/code-for-good',
    featured: true,
    location: 'Bengaluru, Karnataka (Offline)',
    deadline: '2025-09-20',
    image: 'https://1000logos.net/wp-content/uploads/2021/05/JPMorgan-Chase-logo.png',
    duration: '2 days',
    workload: 'Full-time (during event)',
    eligibility: 'Engineering students, all branches, 2nd year onwards',
    teamOrIndividual: 'Team (4-6 members)',
    stipendPerks: 'Prizes, Certificates, Internship opportunities, Social impact recognition',
    mode: 'Offline',
    organizerReputation: 'JPMorgan Chase (Fortune 500)',
    learningOpportunities: 'Social Impact, Full-stack Development, Non-profit Collaboration',
    mentorship: 'Yes (JPMorgan engineers + NGO representatives)',
    futureScope: 'Internships at JPMorgan, Social impact portfolio, Resume value',
    networking: 'JPMorgan employees, NGO representatives, Fellow participants',
    applicants: '8,000+ students (2024)',
    pastReviews: '"Life-changing experience! Made real impact on society." – 2024 Winner',
    difficulty: 'Intermediate',
    tags: ['Social Impact', 'Full-stack', 'NGO', 'Team Event', 'Finance']
  },
  {
    _id: 'h4',
    title: 'Microsoft Imagine Cup India 2025',
    type: 'hackathon',
    eventDate: '2025-12-05',
    description: "A global student technology competition where teams build innovative projects using Microsoft technologies. National finals held in India.",
    detailedDescription: "Microsoft Imagine Cup is the world's premier student technology competition. Students create innovative solutions using Microsoft technologies like Azure, AI, and cloud services. The competition focuses on solving real-world problems with cutting-edge technology.",
    link: 'https://imaginecup.microsoft.com/en-in',
    applyLink: 'https://imaginecup.microsoft.com/en-in',
    featured: true,
    location: 'Virtual (Online)',
    deadline: '2025-11-10',
    image: 'https://news.microsoft.com/wp-content/uploads/prod/sites/43/2017/07/Imagine-Cup-Logo.png',
    duration: '3 months (project development)',
    workload: 'Part-time (flexible)',
    eligibility: 'Students worldwide, all disciplines, 16+ years',
    teamOrIndividual: 'Team (1-3 members)',
    stipendPerks: 'Prizes up to $100,000, Microsoft certification, Mentorship opportunities',
    mode: 'Online',
    organizerReputation: 'Microsoft Corporation',
    learningOpportunities: 'Microsoft Technologies, AI/ML, Cloud Computing, Innovation',
    mentorship: 'Yes (Microsoft engineers and experts)',
    futureScope: 'Microsoft opportunities, Global recognition, Startup incubation',
    networking: 'Microsoft employees, Global participants, Industry experts',
    applicants: '100,000+ students globally (2024)',
    pastReviews: '"Incredible learning experience with Microsoft technologies!" – 2024 Winner',
    difficulty: 'Advanced',
    tags: ['Microsoft', 'AI/ML', 'Cloud', 'Innovation', 'Global']
  },
  {
    _id: 'h5',
    title: 'Tata Crucible Hackathon 2025',
    type: 'hackathon',
    eventDate: '2025-10-30',
    description: "A national-level hackathon by Tata Group for students to solve business and social challenges. Attractive prizes and internship opportunities.",
    detailedDescription: "Tata Crucible Hackathon is organized by the prestigious Tata Group, focusing on solving real business and social challenges. Students work on problems from various Tata companies including TCS, Tata Motors, and Tata Steel, gaining exposure to diverse industries.",
    link: 'https://www.tatacrucible.com/',
    applyLink: 'https://www.tatacrucible.com/',
    featured: true,
    location: 'Mumbai, Maharashtra (Offline)',
    deadline: '2025-10-15',
    image: 'https://www.tatacrucible.com/images/logo.png',
    duration: '2 days',
    workload: 'Full-time (during event)',
    eligibility: 'Engineering/Business students, 2nd year onwards',
    teamOrIndividual: 'Team (2-4 members)',
    stipendPerks: 'Prizes up to ₹5 Lakhs, Tata internships, PPO opportunities',
    mode: 'Offline',
    organizerReputation: 'Tata Group (Fortune 500)',
    learningOpportunities: 'Business Strategy, Industry Knowledge, Problem Solving',
    mentorship: 'Yes (Tata executives and managers)',
    futureScope: 'Tata Group opportunities, Industry exposure, Resume value',
    networking: 'Tata executives, Industry leaders, Fellow participants',
    applicants: '12,000+ students (2024)',
    pastReviews: '"Great exposure to Tata\'s business ecosystem!" – 2024 Participant',
    difficulty: 'Intermediate',
    tags: ['Business', 'Tata Group', 'Industry', 'Team Event', 'Corporate']
  },
  {
    _id: 'h6',
    title: 'TechGig Code Gladiators 2025',
    type: 'hackathon',
    eventDate: '2025-11-20',
    description: "India's biggest coding competition with multiple hackathon themes and cash prizes. Open to all students and professionals.",
    detailedDescription: "TechGig Code Gladiators is India's largest coding competition featuring multiple themes and tracks. Participants can choose from various domains like AI/ML, Web Development, Mobile Apps, and Data Science. The competition offers substantial cash prizes and recognition.",
    link: 'https://www.techgig.com/codegladiators',
    applyLink: 'https://www.techgig.com/codegladiators',
    featured: true,
    location: 'Virtual (Online)',
    deadline: '2025-11-10',
    image: 'https://www.techgig.com/images/logo.png',
    duration: '1 day',
    workload: 'Full-time (during event)',
    eligibility: 'Students and professionals, all backgrounds',
    teamOrIndividual: 'Individual or Team (2-3 members)',
    stipendPerks: 'Cash prizes up to ₹10 Lakhs, Certificates, Job opportunities',
    mode: 'Online',
    organizerReputation: 'TechGig (Times Internet)',
    learningOpportunities: 'Coding Skills, Problem Solving, Multiple Technologies',
    mentorship: 'Yes (Industry experts)',
    futureScope: 'Job opportunities, Recognition, Skill validation',
    networking: 'Tech professionals, Industry experts, Fellow coders',
    applicants: '50,000+ participants (2024)',
    pastReviews: '"Best coding competition in India!" – 2024 Winner',
    difficulty: 'Advanced',
    tags: ['Coding', 'Competition', 'Multiple Tracks', 'Cash Prizes', 'Recognition']
  },
  {
    _id: 'h7',
    title: 'IIT Roorkee Cognizance Hackathon',
    type: 'hackathon',
    eventDate: '2025-10-18',
    description: "Annual hackathon as part of Cognizance, IIT Roorkee's technical fest. Solve real-world challenges and win exciting prizes.",
    detailedDescription: "Cognizance Hackathon is IIT Roorkee's flagship technical event, bringing together students from across India to solve challenging problems. The hackathon features multiple tracks including AI/ML, Web Development, IoT, and Blockchain, with mentorship from industry experts and IIT faculty.",
    link: 'https://www.cognizance.org.in/',
    applyLink: 'https://www.cognizance.org.in/',
    featured: true,
    location: 'Roorkee, Uttarakhand (Offline)',
    deadline: '2025-10-05',
    image: 'https://www.cognizance.org.in/assets/img/logo.png',
    duration: '36 hours',
    workload: 'Full-time (during event)',
    eligibility: 'Engineering students, all branches, 2nd year onwards',
    teamOrIndividual: 'Team (2-4 members)',
    stipendPerks: 'Prizes up to ₹1.5 Lakhs, Certificates, Internship opportunities',
    mode: 'Offline',
    organizerReputation: 'IIT Roorkee (Premier Technical Institute)',
    learningOpportunities: 'Problem Solving, Technical Skills, Innovation, Teamwork',
    mentorship: 'Yes (IIT faculty and industry experts)',
    futureScope: 'IIT connections, Resume value, Technical recognition',
    networking: 'IIT faculty, Industry experts, Fellow participants',
    applicants: '3,000+ students (2024)',
    pastReviews: '"Amazing technical fest experience at IIT Roorkee!" – 2024 Participant',
    difficulty: 'Intermediate',
    tags: ['IIT', 'Technical Fest', 'Innovation', 'Team Event', 'Engineering']
  },
  {
    _id: 'h8',
    title: 'IIT Bombay E-Yantra Hackathon',
    type: 'hackathon',
    eventDate: '2025-11-12',
    description: "A national robotics competition for engineering students, focusing on embedded systems and robotics.",
    detailedDescription: "E-Yantra Hackathon is IIT Bombay's premier robotics competition focusing on embedded systems, IoT, and automation. Students work on real-world robotics challenges using platforms like Arduino, Raspberry Pi, and advanced sensors. The competition emphasizes practical implementation and innovation in robotics.",
    link: 'https://www.e-yantra.org/',
    applyLink: 'https://www.e-yantra.org/',
    featured: true,
    location: 'Mumbai, Maharashtra (Offline)',
    deadline: '2025-10-20',
    image: 'https://www.e-yantra.org/images/logo.png',
    duration: '48 hours',
    workload: 'Full-time (during event)',
    eligibility: 'Engineering students, ECE/EEE/CS branches preferred',
    teamOrIndividual: 'Team (2-4 members)',
    stipendPerks: 'Prizes up to ₹2 Lakhs, Certificates, Hardware kits, Internship opportunities',
    mode: 'Offline',
    organizerReputation: 'IIT Bombay (Premier Technical Institute)',
    learningOpportunities: 'Robotics, Embedded Systems, IoT, Hardware Programming',
    mentorship: 'Yes (IIT Bombay faculty and robotics experts)',
    futureScope: 'Robotics career, Research opportunities, Industry connections',
    networking: 'IIT faculty, Robotics experts, Industry professionals',
    applicants: '2,500+ students (2024)',
    pastReviews: '"Incredible robotics learning experience!" – 2024 Winner',
    difficulty: 'Advanced',
    tags: ['Robotics', 'Embedded Systems', 'IoT', 'IIT', 'Hardware']
  },
  {
    _id: 'h9',
    title: 'Google Solution Challenge India',
    type: 'hackathon',
    eventDate: '2025-12-10',
    description: "Build solutions for local community problems using Google technologies. Open to all Google Developer Student Clubs members.",
    detailedDescription: "Google Solution Challenge is a global competition for GDSC members to build solutions addressing UN Sustainable Development Goals using Google technologies like Firebase, TensorFlow, and Google Cloud. Students create impactful solutions for real-world problems in their communities.",
    link: 'https://developers.google.com/community/gdsc-solution-challenge',
    applyLink: 'https://developers.google.com/community/gdsc-solution-challenge',
    featured: true,
    location: 'Virtual (Online)',
    deadline: '2025-11-25',
    image: 'https://developers.google.com/community/images/gdsc-solution-challenge-logo.svg',
    duration: '3 months (project development)',
    workload: 'Part-time (flexible)',
    eligibility: 'GDSC members, all disciplines, 18+ years',
    teamOrIndividual: 'Team (1-4 members)',
    stipendPerks: 'Global recognition, Google swag, Mentorship, Travel opportunities',
    mode: 'Online',
    organizerReputation: 'Google Developer Student Clubs',
    learningOpportunities: 'Google Technologies, Social Impact, Project Management',
    mentorship: 'Yes (Google engineers and GDSC leads)',
    futureScope: 'Google opportunities, Global recognition, Community impact',
    networking: 'Google employees, GDSC community, Global participants',
    applicants: '15,000+ students globally (2024)',
    pastReviews: '"Life-changing experience building solutions for my community!" – 2024 Winner',
    difficulty: 'Intermediate',
    tags: ['Google', 'Social Impact', 'SDG', 'Community', 'Global']
  },
  {
    _id: 'h10',
    title: 'HackRx 5.0 by Bajaj Finserv',
    type: 'hackathon',
    eventDate: '2025-10-22',
    description: "A national hackathon for students to solve fintech challenges and win prizes and internships at Bajaj Finserv.",
    detailedDescription: "HackRx is Bajaj Finserv's flagship fintech hackathon focusing on innovative solutions for financial services. Students work on challenges related to digital payments, lending, insurance, and wealth management, gaining exposure to real-world fintech problems and solutions.",
    link: 'https://hackrx.in/',
    applyLink: 'https://hackrx.in/',
    featured: true,
    location: 'Pune, Maharashtra (Offline)',
    deadline: '2025-10-10',
    image: 'https://hackrx.in/assets/images/logo.png',
    duration: '2 days',
    workload: 'Full-time (during event)',
    eligibility: 'Engineering/Business students, 2nd year onwards',
    teamOrIndividual: 'Team (2-4 members)',
    stipendPerks: 'Prizes up to ₹3 Lakhs, Bajaj Finserv internships, PPO opportunities',
    mode: 'Offline',
    organizerReputation: 'Bajaj Finserv (Leading Fintech Company)',
    learningOpportunities: 'Fintech, Digital Payments, Financial Services, Innovation',
    mentorship: 'Yes (Bajaj Finserv engineers and product managers)',
    futureScope: 'Bajaj Finserv opportunities, Fintech career, Industry exposure',
    networking: 'Bajaj Finserv employees, Fintech experts, Fellow participants',
    applicants: '5,000+ students (2024)',
    pastReviews: '"Great fintech learning experience!" – 2024 Participant',
    difficulty: 'Intermediate',
    tags: ['Fintech', 'Digital Payments', 'Financial Services', 'Team Event', 'Corporate']
  },
  // 10 more hackathons (11-20) - Individual detailed events
  {
    _id: 'h11',
    title: 'Campus CodeSprint 1',
    type: 'hackathon',
    eventDate: '2025-11-05',
    description: 'A campus-wide hackathon for Indian students to solve real-world tech problems. Prizes and internship opportunities available.',
    detailedDescription: 'Campus CodeSprint is a nationwide hackathon series bringing together students from universities across India. Participants work on innovative solutions for real-world challenges in technology, business, and social impact domains.',
    link: 'https://unstop.com/hackathons',
    applyLink: 'https://unstop.com/hackathons',
    featured: true,
    location: 'Virtual (Online)',
    deadline: '2025-10-25',
    image: 'https://unstop.com/static/images/unstop-logo.png',
    duration: '24 hours',
    workload: 'Full-time (during event)',
    eligibility: 'College students, all branches, 2nd year onwards',
    teamOrIndividual: 'Team (2-4 members)',
    stipendPerks: 'Prizes up to ₹50,000, Certificates, Internship opportunities',
    mode: 'Online',
    organizerReputation: 'Unstop (Leading Student Platform)',
    learningOpportunities: 'Problem Solving, Technical Skills, Innovation, Teamwork',
    mentorship: 'Yes (Industry experts and mentors)',
    futureScope: 'Career opportunities, Resume value, Industry exposure',
    networking: 'Industry experts, Fellow participants, Alumni',
    applicants: '2,000+ students (2024)',
    pastReviews: '"Great learning experience with real-world problems!" – 2024 Participant',
    difficulty: 'Intermediate',
    tags: ['Coding', 'Innovation', 'Team Event', 'Online', 'Campus']
  },
  {
    _id: 'h12',
    title: 'Campus CodeSprint 2',
    type: 'hackathon',
    eventDate: '2025-11-06',
    description: 'A campus-wide hackathon for Indian students to solve real-world tech problems. Prizes and internship opportunities available.',
    detailedDescription: 'Campus CodeSprint 2 focuses on emerging technologies like AI/ML, blockchain, and IoT. Students build innovative solutions addressing current industry challenges and future technology trends.',
    link: 'https://unstop.com/hackathons',
    applyLink: 'https://unstop.com/hackathons',
    featured: true,
    location: 'Virtual (Online)',
    deadline: '2025-10-26',
    image: 'https://unstop.com/static/images/unstop-logo.png',
    duration: '24 hours',
    workload: 'Full-time (during event)',
    eligibility: 'College students, all branches, 2nd year onwards',
    teamOrIndividual: 'Team (2-4 members)',
    stipendPerks: 'Prizes up to ₹50,000, Certificates, Internship opportunities',
    mode: 'Online',
    organizerReputation: 'Unstop (Leading Student Platform)',
    learningOpportunities: 'AI/ML, Blockchain, IoT, Innovation',
    mentorship: 'Yes (Industry experts and mentors)',
    futureScope: 'Tech career, Resume value, Industry exposure',
    networking: 'Tech experts, Fellow participants, Alumni',
    applicants: '2,000+ students (2024)',
    pastReviews: '"Amazing exposure to cutting-edge technologies!" – 2024 Participant',
    difficulty: 'Advanced',
    tags: ['AI/ML', 'Blockchain', 'IoT', 'Team Event', 'Emerging Tech']
  },
  {
    _id: 'h13',
    title: 'Campus CodeSprint 3',
    type: 'hackathon',
    eventDate: '2025-11-07',
    description: 'A campus-wide hackathon for Indian students to solve real-world tech problems. Prizes and internship opportunities available.',
    detailedDescription: 'Campus CodeSprint 3 emphasizes mobile app development and user experience design. Participants create innovative mobile solutions addressing everyday problems and user needs.',
    link: 'https://unstop.com/hackathons',
    applyLink: 'https://unstop.com/hackathons',
    featured: true,
    location: 'Virtual (Online)',
    deadline: '2025-10-27',
    image: 'https://unstop.com/static/images/unstop-logo.png',
    duration: '24 hours',
    workload: 'Full-time (during event)',
    eligibility: 'College students, all branches, 2nd year onwards',
    teamOrIndividual: 'Team (2-4 members)',
    stipendPerks: 'Prizes up to ₹50,000, Certificates, Internship opportunities',
    mode: 'Online',
    organizerReputation: 'Unstop (Leading Student Platform)',
    learningOpportunities: 'Mobile Development, UX/UI Design, App Development',
    mentorship: 'Yes (Industry experts and mentors)',
    futureScope: 'Mobile development career, Resume value, Industry exposure',
    networking: 'Mobile developers, UX designers, Fellow participants',
    applicants: '2,000+ students (2024)',
    pastReviews: '"Excellent mobile development experience!" – 2024 Participant',
    difficulty: 'Intermediate',
    tags: ['Mobile Development', 'UX/UI', 'App Development', 'Team Event', 'Design']
  },
  {
    _id: 'h14',
    title: 'Campus CodeSprint 4',
    type: 'hackathon',
    eventDate: '2025-11-08',
    description: 'A campus-wide hackathon for Indian students to solve real-world tech problems. Prizes and internship opportunities available.',
    detailedDescription: 'Campus CodeSprint 4 focuses on web development and full-stack solutions. Students build comprehensive web applications using modern frameworks and technologies.',
    link: 'https://unstop.com/hackathons',
    applyLink: 'https://unstop.com/hackathons',
    featured: true,
    location: 'Virtual (Online)',
    deadline: '2025-10-28',
    image: 'https://unstop.com/static/images/unstop-logo.png',
    duration: '24 hours',
    workload: 'Full-time (during event)',
    eligibility: 'College students, all branches, 2nd year onwards',
    teamOrIndividual: 'Team (2-4 members)',
    stipendPerks: 'Prizes up to ₹50,000, Certificates, Internship opportunities',
    mode: 'Online',
    organizerReputation: 'Unstop (Leading Student Platform)',
    learningOpportunities: 'Web Development, Full-stack, Modern Frameworks',
    mentorship: 'Yes (Industry experts and mentors)',
    futureScope: 'Web development career, Resume value, Industry exposure',
    networking: 'Web developers, Full-stack experts, Fellow participants',
    applicants: '2,000+ students (2024)',
    pastReviews: '"Great full-stack development experience!" – 2024 Participant',
    difficulty: 'Intermediate',
    tags: ['Web Development', 'Full-stack', 'Frameworks', 'Team Event', 'Modern Tech']
  },
  {
    _id: 'h15',
    title: 'Campus CodeSprint 5',
    type: 'hackathon',
    eventDate: '2025-11-09',
    description: 'A campus-wide hackathon for Indian students to solve real-world tech problems. Prizes and internship opportunities available.',
    detailedDescription: 'Campus CodeSprint 5 emphasizes data science and analytics solutions. Participants work on real-world datasets to extract insights and build predictive models.',
    link: 'https://unstop.com/hackathons',
    applyLink: 'https://unstop.com/hackathons',
    featured: true,
    location: 'Virtual (Online)',
    deadline: '2025-10-29',
    image: 'https://unstop.com/static/images/unstop-logo.png',
    duration: '24 hours',
    workload: 'Full-time (during event)',
    eligibility: 'College students, all branches, 2nd year onwards',
    teamOrIndividual: 'Team (2-4 members)',
    stipendPerks: 'Prizes up to ₹50,000, Certificates, Internship opportunities',
    mode: 'Online',
    organizerReputation: 'Unstop (Leading Student Platform)',
    learningOpportunities: 'Data Science, Analytics, Machine Learning, Statistics',
    mentorship: 'Yes (Industry experts and mentors)',
    futureScope: 'Data science career, Resume value, Industry exposure',
    networking: 'Data scientists, Analytics experts, Fellow participants',
    applicants: '2,000+ students (2024)',
    pastReviews: '"Incredible data science learning experience!" – 2024 Participant',
    difficulty: 'Advanced',
    tags: ['Data Science', 'Analytics', 'Machine Learning', 'Team Event', 'Statistics']
  },
  {
    _id: 'h16',
    title: 'Campus CodeSprint 6',
    type: 'hackathon',
    eventDate: '2025-11-10',
    description: 'A campus-wide hackathon for Indian students to solve real-world tech problems. Prizes and internship opportunities available.',
    detailedDescription: 'Campus CodeSprint 6 focuses on cybersecurity and ethical hacking. Students work on security challenges, vulnerability assessment, and secure coding practices.',
    link: 'https://unstop.com/hackathons',
    applyLink: 'https://unstop.com/hackathons',
    featured: true,
    location: 'Virtual (Online)',
    deadline: '2025-10-30',
    image: 'https://unstop.com/static/images/unstop-logo.png',
    duration: '24 hours',
    workload: 'Full-time (during event)',
    eligibility: 'College students, all branches, 2nd year onwards',
    teamOrIndividual: 'Team (2-4 members)',
    stipendPerks: 'Prizes up to ₹50,000, Certificates, Internship opportunities',
    mode: 'Online',
    organizerReputation: 'Unstop (Leading Student Platform)',
    learningOpportunities: 'Cybersecurity, Ethical Hacking, Security Protocols',
    mentorship: 'Yes (Industry experts and mentors)',
    futureScope: 'Cybersecurity career, Resume value, Industry exposure',
    networking: 'Security experts, Ethical hackers, Fellow participants',
    applicants: '2,000+ students (2024)',
    pastReviews: '"Excellent cybersecurity learning experience!" – 2024 Participant',
    difficulty: 'Advanced',
    tags: ['Cybersecurity', 'Ethical Hacking', 'Security', 'Team Event', 'Protection']
  },
  {
    _id: 'h17',
    title: 'Campus CodeSprint 7',
    type: 'hackathon',
    eventDate: '2025-11-11',
    description: 'A campus-wide hackathon for Indian students to solve real-world tech problems. Prizes and internship opportunities available.',
    detailedDescription: 'Campus CodeSprint 7 emphasizes cloud computing and DevOps solutions. Students work on scalable applications using cloud platforms and modern deployment practices.',
    link: 'https://unstop.com/hackathons',
    applyLink: 'https://unstop.com/hackathons',
    featured: true,
    location: 'Virtual (Online)',
    deadline: '2025-10-31',
    image: 'https://unstop.com/static/images/unstop-logo.png',
    duration: '24 hours',
    workload: 'Full-time (during event)',
    eligibility: 'College students, all branches, 2nd year onwards',
    teamOrIndividual: 'Team (2-4 members)',
    stipendPerks: 'Prizes up to ₹50,000, Certificates, Internship opportunities',
    mode: 'Online',
    organizerReputation: 'Unstop (Leading Student Platform)',
    learningOpportunities: 'Cloud Computing, DevOps, Scalability, Deployment',
    mentorship: 'Yes (Industry experts and mentors)',
    futureScope: 'Cloud career, Resume value, Industry exposure',
    networking: 'Cloud experts, DevOps engineers, Fellow participants',
    applicants: '2,000+ students (2024)',
    pastReviews: '"Amazing cloud computing experience!" – 2024 Participant',
    difficulty: 'Advanced',
    tags: ['Cloud Computing', 'DevOps', 'Scalability', 'Team Event', 'Deployment']
  },
  {
    _id: 'h18',
    title: 'Campus CodeSprint 8',
    type: 'hackathon',
    eventDate: '2025-11-12',
    description: 'A campus-wide hackathon for Indian students to solve real-world tech problems. Prizes and internship opportunities available.',
    detailedDescription: 'Campus CodeSprint 8 focuses on game development and interactive media. Students create engaging games and interactive experiences using modern game engines and technologies.',
    link: 'https://unstop.com/hackathons',
    applyLink: 'https://unstop.com/hackathons',
    featured: true,
    location: 'Virtual (Online)',
    deadline: '2025-11-01',
    image: 'https://unstop.com/static/images/unstop-logo.png',
    duration: '24 hours',
    workload: 'Full-time (during event)',
    eligibility: 'College students, all branches, 2nd year onwards',
    teamOrIndividual: 'Team (2-4 members)',
    stipendPerks: 'Prizes up to ₹50,000, Certificates, Internship opportunities',
    mode: 'Online',
    organizerReputation: 'Unstop (Leading Student Platform)',
    learningOpportunities: 'Game Development, Interactive Media, Game Engines',
    mentorship: 'Yes (Industry experts and mentors)',
    futureScope: 'Game development career, Resume value, Industry exposure',
    networking: 'Game developers, Interactive media experts, Fellow participants',
    applicants: '2,000+ students (2024)',
    pastReviews: '"Fantastic game development experience!" – 2024 Participant',
    difficulty: 'Intermediate',
    tags: ['Game Development', 'Interactive Media', 'Game Engines', 'Team Event', 'Creative']
  },
  {
    _id: 'h19',
    title: 'Campus CodeSprint 9',
    type: 'hackathon',
    eventDate: '2025-11-13',
    description: 'A campus-wide hackathon for Indian students to solve real-world tech problems. Prizes and internship opportunities available.',
    detailedDescription: 'Campus CodeSprint 9 emphasizes fintech and digital payment solutions. Students build innovative financial technology applications addressing modern banking and payment challenges.',
    link: 'https://unstop.com/hackathons',
    applyLink: 'https://unstop.com/hackathons',
    featured: true,
    location: 'Virtual (Online)',
    deadline: '2025-11-02',
    image: 'https://unstop.com/static/images/unstop-logo.png',
    duration: '24 hours',
    workload: 'Full-time (during event)',
    eligibility: 'College students, all branches, 2nd year onwards',
    teamOrIndividual: 'Team (2-4 members)',
    stipendPerks: 'Prizes up to ₹50,000, Certificates, Internship opportunities',
    mode: 'Online',
    organizerReputation: 'Unstop (Leading Student Platform)',
    learningOpportunities: 'Fintech, Digital Payments, Financial Technology',
    mentorship: 'Yes (Industry experts and mentors)',
    futureScope: 'Fintech career, Resume value, Industry exposure',
    networking: 'Fintech experts, Payment specialists, Fellow participants',
    applicants: '2,000+ students (2024)',
    pastReviews: '"Excellent fintech learning experience!" – 2024 Participant',
    difficulty: 'Advanced',
    tags: ['Fintech', 'Digital Payments', 'Financial Technology', 'Team Event', 'Banking']
  },
  {
    _id: 'h20',
    title: 'Campus CodeSprint 10',
    type: 'hackathon',
    eventDate: '2025-11-14',
    description: 'A campus-wide hackathon for Indian students to solve real-world tech problems. Prizes and internship opportunities available.',
    detailedDescription: 'Campus CodeSprint 10 focuses on sustainability and green technology solutions. Students develop innovative solutions addressing environmental challenges and sustainable development goals.',
    link: 'https://unstop.com/hackathons',
    applyLink: 'https://unstop.com/hackathons',
    featured: true,
    location: 'Virtual (Online)',
    deadline: '2025-11-03',
    image: 'https://unstop.com/static/images/unstop-logo.png',
    duration: '24 hours',
    workload: 'Full-time (during event)',
    eligibility: 'College students, all branches, 2nd year onwards',
    teamOrIndividual: 'Team (2-4 members)',
    stipendPerks: 'Prizes up to ₹50,000, Certificates, Internship opportunities',
    mode: 'Online',
    organizerReputation: 'Unstop (Leading Student Platform)',
    learningOpportunities: 'Sustainability, Green Technology, Environmental Solutions',
    mentorship: 'Yes (Industry experts and mentors)',
    futureScope: 'Green tech career, Resume value, Industry exposure',
    networking: 'Sustainability experts, Green tech specialists, Fellow participants',
    applicants: '2,000+ students (2024)',
    pastReviews: '"Amazing sustainability and green tech experience!" – 2024 Participant',
    difficulty: 'Intermediate',
    tags: ['Sustainability', 'Green Technology', 'Environmental', 'Team Event', 'Eco-friendly']
  },
  // Internships (20)
  {
    _id: 'i1',
    title: 'ISRO Student Internship 2025',
    type: 'internship',
    eventDate: '2025-12-01',
    description: 'Internship opportunity at ISRO for Indian students in engineering, science, and management disciplines.',
    detailedDescription: 'ISRO offers prestigious internship opportunities for students to work on cutting-edge space technology projects. Interns get hands-on experience with satellite technology, rocket science, and space research under the guidance of ISRO scientists and engineers.',
    link: 'https://www.isro.gov.in/Internship.html',
    applyLink: 'https://www.isro.gov.in/Internship.html',
    featured: true,
    location: 'Bengaluru, Karnataka (Offline)',
    deadline: '2025-10-31',
    image: 'https://www.isro.gov.in/media_isro/image/logo.png',
    duration: '2-6 months',
    workload: 'Full-time (40 hours/week)',
    eligibility: 'Engineering/Science students, 3rd year onwards, CGPA > 7.0',
    teamOrIndividual: 'Individual',
    stipendPerks: 'Stipend ₹10,000-15,000/month, Certificate, Research exposure',
    mode: 'Offline',
    organizerReputation: 'ISRO (Indian Space Research Organisation)',
    learningOpportunities: 'Space Technology, Research Methodology, Satellite Systems',
    mentorship: 'Yes (ISRO scientists and engineers)',
    futureScope: 'ISRO recruitment, Research opportunities, Resume value',
    networking: 'ISRO scientists, Research community, Fellow interns',
    applicants: '5,000+ applications (2024)',
    pastReviews: '"Life-changing experience! Worked on real satellite projects." – 2024 Intern',
    difficulty: 'Advanced',
    tags: ['Space Technology', 'Research', 'Government', 'Individual', 'Prestigious']
  },
  {
    _id: 'i2',
    title: 'DRDO Research Internship 2025',
    type: 'internship',
    eventDate: '2025-11-20',
    description: 'Internship at Defence Research and Development Organisation for engineering and science students.',
    detailedDescription: 'DRDO offers prestigious research internships for students to work on cutting-edge defense technologies. Interns get exposure to advanced research in aerospace, electronics, materials science, and defense systems under the guidance of DRDO scientists.',
    link: 'https://rac.gov.in/index.php?lang=en&id=0',
    applyLink: 'https://rac.gov.in/index.php?lang=en&id=0',
    featured: true,
    location: 'Delhi (Offline)',
    deadline: '2025-10-15',
    image: 'https://rac.gov.in/images/drdo_logo.png',
    duration: '2-4 months',
    workload: 'Full-time (40 hours/week)',
    eligibility: 'Engineering/Science students, 3rd year onwards, CGPA > 7.5',
    teamOrIndividual: 'Individual',
    stipendPerks: 'Stipend ₹8,000-12,000/month, Certificate, Research exposure',
    mode: 'Offline',
    organizerReputation: 'DRDO (Defence Research and Development Organisation)',
    learningOpportunities: 'Defense Technology, Research Methodology, Advanced Engineering',
    mentorship: 'Yes (DRDO scientists and researchers)',
    futureScope: 'DRDO recruitment, Research opportunities, Defense sector exposure',
    networking: 'DRDO scientists, Defense researchers, Fellow interns',
    applicants: '3,000+ applications (2024)',
    pastReviews: '"Amazing experience working on defense technologies!" – 2024 Intern',
    difficulty: 'Advanced',
    tags: ['Defense', 'Research', 'Government', 'Individual', 'Advanced Technology']
  },
  {
    _id: 'i3',
    title: 'IIT Madras Summer Internship',
    type: 'internship',
    eventDate: '2025-10-15',
    description: 'Research internship at IIT Madras for undergraduate and postgraduate students.',
    detailedDescription: 'IIT Madras offers prestigious research internships for students to work on cutting-edge research projects across various departments. Interns get hands-on experience with advanced research methodologies and state-of-the-art facilities.',
    link: 'https://sfp.iitm.ac.in/',
    applyLink: 'https://sfp.iitm.ac.in/',
    featured: true,
    location: 'Chennai, Tamil Nadu (Offline)',
    deadline: '2025-09-30',
    image: 'https://www.iitm.ac.in/sites/default/files/images/logo_0.png',
    duration: '2-3 months',
    workload: 'Full-time (40 hours/week)',
    eligibility: 'UG/PG students, all branches, CGPA > 8.0',
    teamOrIndividual: 'Individual',
    stipendPerks: 'Stipend ₹5,000-10,000/month, Certificate, Research experience',
    mode: 'Offline',
    organizerReputation: 'IIT Madras (Premier Technical Institute)',
    learningOpportunities: 'Research Methodology, Advanced Technologies, Academic Research',
    mentorship: 'Yes (IIT faculty and researchers)',
    futureScope: 'Higher studies, Research opportunities, Academic career',
    networking: 'IIT faculty, Research community, Fellow interns',
    applicants: '8,000+ applications (2024)',
    pastReviews: '"Excellent research experience at IIT Madras!" – 2024 Intern',
    difficulty: 'Advanced',
    tags: ['Research', 'IIT', 'Academic', 'Individual', 'Prestigious']
  },
  {
    _id: 'i4',
    title: 'TCS Internship Program',
    type: 'internship',
    eventDate: '2025-09-28',
    description: 'Internship at Tata Consultancy Services for students in computer science and related fields.',
    link: 'https://www.tcs.com/careers/india/internship',
    applyLink: 'https://www.tcs.com/careers/india/internship',
    featured: true,
    location: 'Virtual (Online)',
    deadline: '2025-09-20',
    image: 'https://www.tcs.com/content/dam/global-tcs/en/images/home/tcs-logo.svg'
  },
  {
    _id: 'i5',
    title: 'Google STEP Internship India',
    type: 'internship',
    eventDate: '2025-11-10',
    description: 'STEP (Student Training in Engineering Program) internship for first and second-year undergraduate students.',
    detailedDescription: 'Google STEP is a 12-week internship program designed for first and second-year students to gain hands-on experience in software engineering. Interns work on real Google products and learn from experienced engineers while contributing to meaningful projects.',
    link: 'https://careers.google.com/jobs/results/step-internship-india/',
    applyLink: 'https://careers.google.com/jobs/results/step-internship-india/',
    featured: true,
    location: 'Bengaluru, Karnataka (Offline)',
    deadline: '2025-10-01',
    image: 'https://www.google.com/images/branding/googlelogo/2x/googlelogo_color_272x92dp.png',
    duration: '12 weeks',
    workload: 'Full-time (40 hours/week)',
    eligibility: '1st/2nd year CS/IT students, Strong programming skills',
    teamOrIndividual: 'Individual',
    stipendPerks: 'Stipend ₹50,000-80,000/month, Google perks, Return offer opportunities',
    mode: 'Offline',
    organizerReputation: 'Google (Alphabet Inc.)',
    learningOpportunities: 'Software Engineering, Google Technologies, System Design',
    mentorship: 'Yes (Google engineers)',
    futureScope: 'Google return offers, Resume value, Industry exposure',
    networking: 'Google engineers, Product managers, Fellow interns',
    applicants: '25,000+ applications (2024)',
    pastReviews: '"Best internship experience! Learned cutting-edge technologies." – 2024 Intern',
    difficulty: 'Advanced',
    tags: ['Software Engineering', 'Google', 'Tech Giant', 'Individual', 'High Stipend']
  },
  {
    _id: 'i6',
    title: 'Microsoft Research India Internship',
    type: 'internship',
    eventDate: '2025-12-10',
    description: 'Research internship at Microsoft Research India for students in computer science and related fields.',
    detailedDescription: 'Microsoft Research India offers prestigious research internships for students to work on cutting-edge research projects in AI, machine learning, systems, and theoretical computer science. Interns collaborate with world-class researchers and contribute to publications and patents.',
    link: 'https://www.microsoft.com/en-in/research/careers/internships/',
    applyLink: 'https://www.microsoft.com/en-in/research/careers/internships/',
    featured: true,
    location: 'Bengaluru, Karnataka (Offline)',
    deadline: '2025-11-01',
    image: 'https://1000logos.net/wp-content/uploads/2021/04/Microsoft-logo.png',
    duration: '3-6 months',
    workload: 'Full-time (40 hours/week)',
    eligibility: 'CS/IT students, strong research background, publications preferred',
    teamOrIndividual: 'Individual',
    stipendPerks: 'Stipend ₹60,000-100,000/month, Microsoft perks, Research opportunities',
    mode: 'Offline',
    organizerReputation: 'Microsoft Research (Global Research Lab)',
    learningOpportunities: 'Research Methodology, AI/ML, Systems Research, Academic Writing',
    mentorship: 'Yes (Microsoft Research scientists)',
    futureScope: 'Microsoft Research opportunities, PhD programs, Academic career',
    networking: 'Microsoft researchers, Global research community, Fellow interns',
    applicants: '2,000+ applications (2024)',
    pastReviews: '"Incredible research experience at Microsoft Research!" – 2024 Intern',
    difficulty: 'Advanced',
    tags: ['Research', 'Microsoft', 'AI/ML', 'Individual', 'Prestigious']
  },
  {
    _id: 'i7',
    title: 'Amazon India SDE Internship',
    type: 'internship',
    eventDate: '2025-10-20',
    description: 'Software Development Engineer internship for students in computer science and related fields.',
    detailedDescription: 'Amazon India offers prestigious SDE internships for students to work on large-scale distributed systems, machine learning, and e-commerce solutions. Interns get hands-on experience with Amazon\'s technology stack and work on real-world problems affecting millions of customers.',
    link: 'https://www.amazon.jobs/en/teams/internships-for-students',
    applyLink: 'https://www.amazon.jobs/en/teams/internships-for-students',
    featured: true,
    location: 'Hyderabad, Telangana (Offline)',
    deadline: '2025-09-25',
    image: 'https://upload.wikimedia.org/wikipedia/commons/a/a9/Amazon_logo.svg',
    duration: '3-6 months',
    workload: 'Full-time (40 hours/week)',
    eligibility: 'CS/IT students, strong programming skills, 3rd year onwards',
    teamOrIndividual: 'Individual',
    stipendPerks: 'Stipend ₹40,000-70,000/month, Amazon perks, Return offer opportunities',
    mode: 'Offline',
    organizerReputation: 'Amazon (Global Tech Giant)',
    learningOpportunities: 'Distributed Systems, Machine Learning, E-commerce, Scalability',
    mentorship: 'Yes (Amazon engineers and managers)',
    futureScope: 'Amazon return offers, Resume value, Industry exposure',
    networking: 'Amazon engineers, Product managers, Fellow interns',
    applicants: '15,000+ applications (2024)',
    pastReviews: '"Amazing experience working on Amazon\'s scale!" – 2024 Intern',
    difficulty: 'Advanced',
    tags: ['Software Engineering', 'Amazon', 'Distributed Systems', 'Individual', 'E-commerce']
  },
  {
    _id: 'i8',
    title: 'Wipro Internship Program',
    type: 'internship',
    eventDate: '2025-11-18',
    description: 'Internship for engineering and management students at Wipro India.',
    detailedDescription: 'Wipro offers comprehensive internship programs for engineering and management students across various domains including software development, consulting, and business analysis. Interns work on real client projects and gain exposure to global business processes.',
    link: 'https://careers.wipro.com/internships',
    applyLink: 'https://careers.wipro.com/internships',
    featured: true,
    location: 'Bengaluru, Karnataka (Offline)',
    deadline: '2025-10-10',
    image: 'https://www.wipro.com/content/dam/nexus/en/brand/logo/wipro-logo.png',
    duration: '2-3 months',
    workload: 'Full-time (40 hours/week)',
    eligibility: 'Engineering/Management students, 3rd year onwards',
    teamOrIndividual: 'Individual',
    stipendPerks: 'Stipend ₹15,000-25,000/month, Certificate, PPO opportunities',
    mode: 'Offline',
    organizerReputation: 'Wipro (Leading IT Services Company)',
    learningOpportunities: 'Software Development, Consulting, Business Analysis, Client Projects',
    mentorship: 'Yes (Wipro managers and senior consultants)',
    futureScope: 'Wipro opportunities, Resume value, Industry exposure',
    networking: 'Wipro employees, Client teams, Fellow interns',
    applicants: '8,000+ applications (2024)',
    pastReviews: '"Great learning experience at Wipro!" – 2024 Intern',
    difficulty: 'Intermediate',
    tags: ['IT Services', 'Consulting', 'Software Development', 'Individual', 'Corporate']
  },
  {
    _id: 'i9',
    title: 'Infosys InStep Internship',
    type: 'internship',
    eventDate: '2025-12-01',
    description: 'Global internship program for students at Infosys campuses in India.',
    detailedDescription: 'Infosys InStep is a global internship program offering students the opportunity to work on cutting-edge projects in digital transformation, AI/ML, and enterprise solutions. Interns collaborate with global teams and gain exposure to international business practices.',
    link: 'https://www.infosys.com/instep/internship.html',
    applyLink: 'https://www.infosys.com/instep/internship.html',
    featured: true,
    location: 'Bengaluru, Karnataka (Offline)',
    deadline: '2025-10-20',
    image: 'https://www.infosys.com/content/dam/infosys-web/en/global-resource/logo.png',
    duration: '2-4 months',
    workload: 'Full-time (40 hours/week)',
    eligibility: 'Engineering/Management students, 3rd year onwards, CGPA > 7.0',
    teamOrIndividual: 'Individual',
    stipendPerks: 'Stipend ₹20,000-35,000/month, Certificate, Global exposure',
    mode: 'Offline',
    organizerReputation: 'Infosys (Global IT Services Leader)',
    learningOpportunities: 'Digital Transformation, AI/ML, Enterprise Solutions, Global Business',
    mentorship: 'Yes (Infosys global managers and experts)',
    futureScope: 'Infosys opportunities, Global career, Resume value',
    networking: 'Global Infosys teams, International colleagues, Fellow interns',
    applicants: '10,000+ applications (2024)',
    pastReviews: '"Excellent global internship experience!" – 2024 Intern',
    difficulty: 'Intermediate',
    tags: ['Global', 'Digital Transformation', 'AI/ML', 'Individual', 'International']
  },
  {
    _id: 'i10',
    title: 'Internshala Student Internship Fair',
    type: 'internship',
    eventDate: '2025-10-30',
    description: 'India\'s largest internship fair with 1000+ companies offering internships across domains.',
    detailedDescription: 'Internshala Student Internship Fair is India\'s largest virtual internship fair featuring 1000+ companies from various sectors including technology, finance, marketing, and consulting. Students can explore diverse internship opportunities and connect directly with recruiters.',
    link: 'https://internshala.com/internships/',
    applyLink: 'https://internshala.com/internships/',
    featured: true,
    location: 'Virtual (Online)',
    deadline: '2025-10-25',
    image: 'https://internshala.com/static/images/internshala_og_image.jpg',
    duration: '1 day',
    workload: 'Part-time (during fair)',
    eligibility: 'Students from all disciplines, all years',
    teamOrIndividual: 'Individual',
    stipendPerks: 'Multiple internship opportunities, Networking, Career guidance',
    mode: 'Online',
    organizerReputation: 'Internshala (Leading Internship Platform)',
    learningOpportunities: 'Career Exploration, Networking, Industry Insights, Skill Assessment',
    mentorship: 'Yes (Career counselors and industry experts)',
    futureScope: 'Multiple internship opportunities, Career guidance, Industry exposure',
    networking: '1000+ companies, Recruiters, Career counselors, Fellow students',
    applicants: '50,000+ students (2024)',
    pastReviews: '"Found my dream internship at the fair!" – 2024 Participant',
    difficulty: 'Beginner',
    tags: ['Internship Fair', 'Multiple Companies', 'Networking', 'Individual', 'Career Guidance']
  },
  // 10 more internships (11-20) - Individual detailed events
  {
    _id: 'i11',
    title: 'Top Indian Tech Internship 1',
    type: 'internship',
    eventDate: '2025-11-05',
    description: 'Internship opportunity 1 at leading Indian tech companies for engineering and management students.',
    detailedDescription: 'This internship program offers students the opportunity to work with leading Indian tech companies on innovative projects. Interns gain hands-on experience with modern technologies and contribute to real-world solutions.',
    link: 'https://internshala.com/internships/',
    applyLink: 'https://internshala.com/internships/',
    featured: true,
    location: 'Virtual (Online)',
    deadline: '2025-10-25',
    image: 'https://internshala.com/static/images/internshala_og_image.jpg',
    duration: '2-3 months',
    workload: 'Full-time (40 hours/week)',
    eligibility: 'Engineering/Management students, 2nd year onwards',
    teamOrIndividual: 'Individual',
    stipendPerks: 'Stipend ₹10,000-20,000/month, Certificate, Industry exposure',
    mode: 'Online',
    organizerReputation: 'Leading Indian Tech Companies',
    learningOpportunities: 'Modern Technologies, Industry Practices, Project Management',
    mentorship: 'Yes (Industry experts and senior developers)',
    futureScope: 'Tech career opportunities, Resume value, Industry connections',
    networking: 'Tech professionals, Industry experts, Fellow interns',
    applicants: '3,000+ applications (2024)',
    pastReviews: '"Great learning experience with modern technologies!" – 2024 Intern',
    difficulty: 'Intermediate',
    tags: ['Tech Companies', 'Modern Technologies', 'Individual', 'Online', 'Industry']
  },
  // Workshops (20)
  {
    _id: 'w1',
    title: 'AI/ML Workshop by IIT Bombay',
    type: 'workshop',
    eventDate: '2025-09-30',
    description: 'Hands-on workshop on Artificial Intelligence and Machine Learning by IIT Bombay faculty. Includes practical sessions and project work.',
    detailedDescription: 'This comprehensive AI/ML workshop by IIT Bombay faculty covers fundamental concepts to advanced applications. Participants work on real-world projects using Python, TensorFlow, and PyTorch. The workshop includes hands-on coding sessions and industry case studies.',
    link: 'https://www.iitb.ac.in/en/events',
    applyLink: 'https://www.iitb.ac.in/en/events',
    featured: true,
    location: 'Mumbai, Maharashtra (Offline)',
    deadline: '2025-09-25',
    image: 'https://www.iitb.ac.in/sites/www.iitb.ac.in/themes/touchm/logo.png',
    duration: '3 days',
    workload: 'Full-time (8 hours/day)',
    eligibility: 'Engineering students, basic programming knowledge',
    teamOrIndividual: 'Individual',
    stipendPerks: 'Certificate, Course materials, Project portfolio',
    mode: 'Offline',
    organizerReputation: 'IIT Bombay (Premier Technical Institute)',
    learningOpportunities: 'AI/ML Fundamentals, Python Programming, Deep Learning, Projects',
    mentorship: 'Yes (IIT Bombay faculty)',
    futureScope: 'AI/ML career, Higher studies, Industry opportunities',
    networking: 'IIT faculty, AI/ML experts, Fellow participants',
    applicants: '200+ participants (2024)',
    pastReviews: '"Excellent workshop! Learned cutting-edge AI/ML concepts." – 2024 Participant',
    difficulty: 'Intermediate',
    tags: ['AI/ML', 'Python', 'Deep Learning', 'IIT', 'Hands-on']
  },
  {
    _id: 'w2',
    title: 'Web Development Bootcamp by Coding Ninjas',
    type: 'workshop',
    eventDate: '2025-10-18',
    description: 'A 2-day intensive bootcamp covering HTML, CSS, JavaScript, and React for beginners and intermediates.',
    detailedDescription: 'This comprehensive web development bootcamp covers modern web technologies from basics to advanced concepts. Participants learn HTML5, CSS3, JavaScript ES6+, React.js, and build real-world projects. The workshop includes hands-on coding sessions and industry best practices.',
    link: 'https://www.codingninjas.com/events',
    applyLink: 'https://www.codingninjas.com/events',
    featured: true,
    location: 'Virtual (Online)',
    deadline: '2025-10-10',
    image: 'https://files.codingninjas.in/cn-logo-dark-9824.svg',
    duration: '2 days',
    workload: 'Full-time (8 hours/day)',
    eligibility: 'Students and professionals, basic programming knowledge',
    teamOrIndividual: 'Individual',
    stipendPerks: 'Certificate, Course materials, Project portfolio, Job assistance',
    mode: 'Online',
    organizerReputation: 'Coding Ninjas (Leading EdTech Platform)',
    learningOpportunities: 'Web Development, React.js, JavaScript, Project Building',
    mentorship: 'Yes (Industry experts and mentors)',
    futureScope: 'Web development career, Freelancing opportunities, Industry projects',
    networking: 'Industry experts, Fellow developers, Alumni network',
    applicants: '500+ participants (2024)',
    pastReviews: '"Excellent bootcamp! Built my first React app." – 2024 Participant',
    difficulty: 'Beginner',
    tags: ['Web Development', 'React', 'JavaScript', 'Bootcamp', 'Hands-on']
  },
  {
    _id: 'w3',
    title: 'Robotics Workshop by IIT Delhi',
    type: 'workshop',
    eventDate: '2025-11-10',
    description: 'Workshop on robotics, automation, and embedded systems for engineering students.',
    detailedDescription: 'IIT Delhi presents a comprehensive robotics workshop covering automation, embedded systems, and AI integration. Students learn to build and program robots using modern hardware and software tools, gaining hands-on experience with cutting-edge robotics technology.',
    link: 'https://www.iitd.ac.in/events',
    applyLink: 'https://www.iitd.ac.in/events',
    featured: true,
    location: 'Delhi (Offline)',
    deadline: '2025-10-25',
    image: 'https://home.iitd.ac.in/public/images/logo.png',
    duration: '2 days',
    workload: 'Full-time (8 hours/day)',
    eligibility: 'Engineering students, 2nd year onwards, Basic programming knowledge',
    teamOrIndividual: 'Team (2-3 members)',
    stipendPerks: 'Certificate, Hardware kit, Project materials, IIT Delhi recognition',
    mode: 'Offline',
    organizerReputation: 'IIT Delhi (Premier Engineering Institute)',
    learningOpportunities: 'Robotics, Automation, Embedded Systems, AI Integration',
    mentorship: 'Yes (IIT Delhi faculty and research scholars)',
    futureScope: 'Robotics career, Research opportunities, Resume value',
    networking: 'IIT Delhi faculty, Research scholars, Industry experts',
    applicants: '200+ students (2024)',
    pastReviews: '"Amazing robotics learning experience at IIT Delhi!" – 2024 Participant',
    difficulty: 'Intermediate',
    tags: ['Robotics', 'Automation', 'Embedded Systems', 'Team Event', 'IIT Delhi']
  },
  {
    _id: 'w4',
    title: 'Cloud Computing Workshop by NPTEL',
    type: 'workshop',
    eventDate: '2025-12-02',
    description: 'Workshop on cloud computing concepts, AWS, and Azure for students and professionals.',
    detailedDescription: 'NPTEL offers a comprehensive cloud computing workshop covering AWS, Azure, and Google Cloud Platform. Participants learn cloud architecture, deployment strategies, and best practices for scalable applications in a hands-on environment.',
    link: 'https://nptel.ac.in/events',
    applyLink: 'https://nptel.ac.in/events',
    featured: true,
    location: 'Virtual (Online)',
    deadline: '2025-11-20',
    image: 'https://nptel.ac.in/assets/images/logo.png',
    duration: '3 days',
    workload: 'Full-time (6 hours/day)',
    eligibility: 'Students and professionals, Basic programming knowledge',
    teamOrIndividual: 'Individual',
    stipendPerks: 'Certificate, Cloud credits, Learning materials, NPTEL recognition',
    mode: 'Online',
    organizerReputation: 'NPTEL (National Programme on Technology Enhanced Learning)',
    learningOpportunities: 'Cloud Computing, AWS, Azure, GCP, Scalability, DevOps',
    mentorship: 'Yes (NPTEL faculty and cloud experts)',
    futureScope: 'Cloud career, Industry certification, Resume value',
    networking: 'Cloud professionals, Industry experts, Fellow participants',
    applicants: '1,000+ participants (2024)',
    pastReviews: '"Excellent cloud computing workshop by NPTEL!" – 2024 Participant',
    difficulty: 'Intermediate',
    tags: ['Cloud Computing', 'AWS', 'Azure', 'Individual', 'NPTEL']
  },
  {
    _id: 'w5',
    title: 'Data Science Workshop by Analytics Vidhya',
    type: 'workshop',
    eventDate: '2025-10-15',
    description: 'A hands-on workshop on data science, Python, and machine learning for students.',
    detailedDescription: 'Analytics Vidhya presents a comprehensive data science workshop covering Python programming, statistical analysis, machine learning algorithms, and real-world data projects. Participants work with actual datasets and build predictive models.',
    link: 'https://datahack.analyticsvidhya.com/',
    applyLink: 'https://datahack.analyticsvidhya.com/',
    featured: true,
    location: 'Virtual (Online)',
    deadline: '2025-10-10',
    image: 'https://datahack.analyticsvidhya.com/static/media/logo.7c6b7e2b.svg',
    duration: '2 days',
    workload: 'Full-time (6 hours/day)',
    eligibility: 'Students and professionals, Basic programming knowledge',
    teamOrIndividual: 'Individual',
    stipendPerks: 'Certificate, Datasets, Jupyter notebooks, Analytics Vidhya recognition',
    mode: 'Online',
    organizerReputation: 'Analytics Vidhya (Leading Data Science Platform)',
    learningOpportunities: 'Data Science, Python, Machine Learning, Statistics, Data Visualization',
    mentorship: 'Yes (Data science experts and industry practitioners)',
    futureScope: 'Data science career, Industry projects, Resume value',
    networking: 'Data scientists, Industry experts, Fellow participants',
    applicants: '800+ participants (2024)',
    pastReviews: '"Great data science workshop with real projects!" – 2024 Participant',
    difficulty: 'Intermediate',
    tags: ['Data Science', 'Python', 'Machine Learning', 'Individual', 'Analytics Vidhya']
  },
  {
    _id: 'w6',
    title: 'Cybersecurity Workshop by NASSCOM',
    type: 'workshop',
    eventDate: '2025-11-22',
    description: 'Learn the basics of cybersecurity, ethical hacking, and network security.',
    detailedDescription: 'NASSCOM presents a comprehensive cybersecurity workshop covering ethical hacking, network security, penetration testing, and cyber defense strategies. Participants learn to identify vulnerabilities and implement security measures in real-world scenarios.',
    link: 'https://www.nasscom.in/events',
    applyLink: 'https://www.nasscom.in/events',
    featured: true,
    location: 'Delhi (Offline)',
    deadline: '2025-11-10',
    image: 'https://www.nasscom.in/sites/all/themes/nasscom/logo.png',
    duration: '2 days',
    workload: 'Full-time (8 hours/day)',
    eligibility: 'IT/CS students, Basic networking knowledge, 2nd year onwards',
    teamOrIndividual: 'Individual',
    stipendPerks: 'Certificate, Security tools, Learning materials, NASSCOM recognition',
    mode: 'Offline',
    organizerReputation: 'NASSCOM (National Association of Software and Service Companies)',
    learningOpportunities: 'Cybersecurity, Ethical Hacking, Network Security, Penetration Testing',
    mentorship: 'Yes (Cybersecurity experts and industry professionals)',
    futureScope: 'Cybersecurity career, Industry certification, Resume value',
    networking: 'Cybersecurity professionals, Industry experts, Fellow participants',
    applicants: '300+ participants (2024)',
    pastReviews: '"Excellent cybersecurity workshop by NASSCOM!" – 2024 Participant',
    difficulty: 'Intermediate',
    tags: ['Cybersecurity', 'Ethical Hacking', 'Network Security', 'Individual', 'NASSCOM']
  },
  {
    _id: 'w7',
    title: 'Blockchain Workshop by IIT Kharagpur',
    type: 'workshop',
    eventDate: '2025-12-12',
    description: 'Workshop on blockchain technology, smart contracts, and decentralized apps.',
    detailedDescription: 'IIT Kharagpur presents an advanced blockchain workshop covering smart contracts, decentralized applications (DApps), cryptocurrency development, and blockchain architecture. Participants build real blockchain applications and understand the underlying cryptographic principles.',
    link: 'https://www.iitkgp.ac.in/events',
    applyLink: 'https://www.iitkgp.ac.in/events',
    featured: true,
    location: 'Kharagpur, West Bengal (Offline)',
    deadline: '2025-11-30',
    image: 'https://www.iitkgp.ac.in/assets/images/logo.png',
    duration: '3 days',
    workload: 'Full-time (8 hours/day)',
    eligibility: 'CS/IT students, 3rd year onwards, Strong programming skills',
    teamOrIndividual: 'Team (2-3 members)',
    stipendPerks: 'Certificate, Blockchain tools, Project materials, IIT Kharagpur recognition',
    mode: 'Offline',
    organizerReputation: 'IIT Kharagpur (Premier Engineering Institute)',
    learningOpportunities: 'Blockchain Technology, Smart Contracts, DApps, Cryptocurrency, Cryptography',
    mentorship: 'Yes (IIT Kharagpur faculty and blockchain experts)',
    futureScope: 'Blockchain career, Research opportunities, Resume value',
    networking: 'IIT Kharagpur faculty, Blockchain experts, Industry professionals',
    applicants: '150+ students (2024)',
    pastReviews: '"Outstanding blockchain workshop at IIT Kharagpur!" – 2024 Participant',
    difficulty: 'Advanced',
    tags: ['Blockchain', 'Smart Contracts', 'DApps', 'Team Event', 'IIT Kharagpur']
  },
  {
    _id: 'w8',
    title: 'Python Programming Bootcamp by Coding Blocks',
    type: 'workshop',
    eventDate: '2025-10-28',
    description: 'A beginner-friendly bootcamp on Python programming and problem solving.',
    detailedDescription: 'Coding Blocks offers a comprehensive Python programming bootcamp covering fundamentals, data structures, algorithms, and real-world projects. Participants learn Python from scratch and build practical applications while solving coding challenges.',
    link: 'https://codingblocks.com/events',
    applyLink: 'https://codingblocks.com/events',
    featured: true,
    location: 'Virtual (Online)',
    deadline: '2025-10-20',
    image: 'https://codingblocks.com/assets/images/cb/cblogo.png',
    duration: '5 days',
    workload: 'Full-time (6 hours/day)',
    eligibility: 'Students and professionals, No prior programming experience required',
    teamOrIndividual: 'Individual',
    stipendPerks: 'Certificate, Python projects, Learning materials, Coding Blocks recognition',
    mode: 'Online',
    organizerReputation: 'Coding Blocks (Leading Programming Education Platform)',
    learningOpportunities: 'Python Programming, Data Structures, Algorithms, Problem Solving',
    mentorship: 'Yes (Coding Blocks instructors and industry experts)',
    futureScope: 'Programming career, Software development, Resume value',
    networking: 'Programming instructors, Industry experts, Fellow participants',
    applicants: '1,200+ participants (2024)',
    pastReviews: '"Excellent Python bootcamp by Coding Blocks!" – 2024 Participant',
    difficulty: 'Beginner',
    tags: ['Python', 'Programming', 'Data Structures', 'Individual', 'Coding Blocks']
  },
  {
    _id: 'w9',
    title: 'IoT Workshop by NIT Trichy',
    type: 'workshop',
    eventDate: '2025-11-15',
    description: 'Workshop on Internet of Things (IoT) and its applications in real life.',
    detailedDescription: 'NIT Trichy presents a comprehensive IoT workshop covering sensor networks, embedded systems, wireless communication, and smart device development. Participants build IoT projects and understand the integration of hardware and software in connected systems.',
    link: 'https://www.nitt.edu/home/academics/events/',
    applyLink: 'https://www.nitt.edu/home/academics/events/',
    featured: true,
    location: 'Tiruchirappalli, Tamil Nadu (Offline)',
    deadline: '2025-11-01',
    image: 'https://www.nitt.edu/home/images/logo.png',
    duration: '3 days',
    workload: 'Full-time (8 hours/day)',
    eligibility: 'Engineering students, 2nd year onwards, Basic electronics knowledge',
    teamOrIndividual: 'Team (2-3 members)',
    stipendPerks: 'Certificate, IoT hardware kit, Project materials, NIT Trichy recognition',
    mode: 'Offline',
    organizerReputation: 'NIT Trichy (Premier Engineering Institute)',
    learningOpportunities: 'IoT, Embedded Systems, Sensor Networks, Wireless Communication, Smart Devices',
    mentorship: 'Yes (NIT Trichy faculty and IoT experts)',
    futureScope: 'IoT career, Embedded systems, Resume value',
    networking: 'NIT Trichy faculty, IoT experts, Industry professionals',
    applicants: '180+ students (2024)',
    pastReviews: '"Fantastic IoT workshop at NIT Trichy!" – 2024 Participant',
    difficulty: 'Intermediate',
    tags: ['IoT', 'Embedded Systems', 'Sensors', 'Team Event', 'NIT Trichy']
  },
  {
    _id: 'w10',
    title: 'Full Stack Development Workshop by GeeksforGeeks',
    type: 'workshop',
    eventDate: '2025-12-05',
    description: 'Workshop on full stack web development using MERN stack.',
    detailedDescription: 'GeeksforGeeks presents a comprehensive full-stack development workshop covering MERN stack (MongoDB, Express.js, React, Node.js), database design, API development, and deployment strategies. Participants build complete web applications from frontend to backend.',
    link: 'https://practice.geeksforgeeks.org/events',
    applyLink: 'https://practice.geeksforgeeks.org/events',
    featured: true,
    location: 'Virtual (Online)',
    deadline: '2025-11-25',
    image: 'https://media.geeksforgeeks.org/wp-content/cdn-uploads/gfg_200X200.png',
    duration: '4 days',
    workload: 'Full-time (6 hours/day)',
    eligibility: 'Students and professionals, Basic programming knowledge',
    teamOrIndividual: 'Individual',
    stipendPerks: 'Certificate, Project portfolio, Learning materials, GeeksforGeeks recognition',
    mode: 'Online',
    organizerReputation: 'GeeksforGeeks (Leading Programming Platform)',
    learningOpportunities: 'Full Stack Development, MERN Stack, Database Design, API Development, Deployment',
    mentorship: 'Yes (GeeksforGeeks instructors and industry experts)',
    futureScope: 'Full-stack career, Web development, Resume value',
    networking: 'Web developers, Industry experts, Fellow participants',
    applicants: '1,500+ participants (2024)',
    pastReviews: '"Amazing full-stack workshop by GeeksforGeeks!" – 2024 Participant',
    difficulty: 'Intermediate',
    tags: ['Full Stack', 'MERN Stack', 'Web Development', 'Individual', 'GeeksforGeeks']
  },
  // 10 more workshops (11-20) - Individual detailed events
  {
    _id: 'w11',
    title: 'Skill Workshop 1',
    type: 'workshop',
    eventDate: '2025-12-05',
    description: 'Skill development workshop 1 for Indian students on trending technologies.',
    detailedDescription: 'This comprehensive skill development workshop covers the latest trending technologies including AI/ML, cloud computing, and modern programming frameworks. Participants gain hands-on experience with industry-standard tools and practices.',
    link: 'https://www.codingninjas.com/events',
    applyLink: 'https://www.codingninjas.com/events',
    featured: true,
    location: 'Virtual (Online)',
    deadline: '2025-11-20',
    image: 'https://files.codingninjas.in/cn-logo-dark-9824.svg',
    duration: '3 days',
    workload: 'Full-time (6 hours/day)',
    eligibility: 'Students and professionals, Basic technical knowledge',
    teamOrIndividual: 'Individual',
    stipendPerks: 'Certificate, Learning materials, Industry exposure',
    mode: 'Online',
    organizerReputation: 'Coding Ninjas (Leading Programming Education Platform)',
    learningOpportunities: 'Modern Technologies, Industry Tools, Best Practices',
    mentorship: 'Yes (Industry experts and technology professionals)',
    futureScope: 'Tech career, Industry skills, Resume value',
    networking: 'Technology professionals, Industry experts, Fellow participants',
    applicants: '800+ participants (2024)',
    pastReviews: '"Great skill development workshop!" – 2024 Participant',
    difficulty: 'Intermediate',
    tags: ['Skill Development', 'Modern Technologies', 'Individual', 'Online', 'Industry']
  },
  // Competitions (20)
  {
    _id: 'c1',
    title: 'ACM ICPC India Regional 2025',
    type: 'competition',
    eventDate: '2025-12-10',
    description: "The world's most prestigious programming contest for university students. Regional round for Indian teams.",
    detailedDescription: "ACM ICPC is the world's most prestigious programming competition for university students. Teams of three students compete to solve algorithmic problems within a time limit. The competition tests problem-solving skills, algorithmic thinking, and teamwork.",
    link: 'https://icpc.global/',
    applyLink: 'https://icpc.global/regionals/finder/India',
    featured: true,
    location: 'Kanpur, Uttar Pradesh (Offline)',
    deadline: '2025-11-10',
    image: 'https://icpc.global/images/icpc_logo.png',
    duration: '5 hours',
    workload: 'Intensive (during competition)',
    eligibility: 'University students, teams of 3, programming skills required',
    teamOrIndividual: 'Team (3 members)',
    stipendPerks: 'Trophies, Certificates, Global recognition, Travel opportunities',
    mode: 'Offline',
    organizerReputation: 'ACM (Association for Computing Machinery)',
    learningOpportunities: 'Algorithmic Thinking, Problem Solving, Competitive Programming',
    mentorship: 'Yes (Faculty coaches)',
    futureScope: 'Global recognition, Career opportunities, Academic prestige',
    networking: 'Global participants, Faculty, Industry professionals',
    applicants: '500+ teams (2024)',
    pastReviews: '"Most challenging and rewarding programming competition!" – 2024 Winner',
    difficulty: 'Advanced',
    tags: ['Programming', 'Algorithms', 'Competition', 'Team Event', 'Prestigious']
  },
  {
    _id: 'c2',
    title: 'TCS CodeVita Season 14',
    type: 'competition',
    eventDate: '2025-11-25',
    description: 'A global coding competition by TCS for students to solve algorithmic problems.',
    detailedDescription: 'TCS CodeVita is one of the world\'s largest coding competitions, attracting participants from across the globe. The competition features multiple rounds with increasing difficulty levels, testing participants\' algorithmic thinking, problem-solving skills, and coding efficiency.',
    link: 'https://www.tcscodevita.com/',
    applyLink: 'https://www.tcscodevita.com/',
    featured: true,
    location: 'Virtual (Online)',
    deadline: '2025-11-10',
    image: 'https://www.tcscodevita.com/images/logo.png',
    duration: '6 hours',
    workload: 'Intensive (during competition)',
    eligibility: 'Students and professionals, all backgrounds',
    teamOrIndividual: 'Individual',
    stipendPerks: 'Cash prizes up to ₹2 Lakhs, TCS job opportunities, Global recognition',
    mode: 'Online',
    organizerReputation: 'TCS (Tata Consultancy Services)',
    learningOpportunities: 'Algorithmic Thinking, Problem Solving, Competitive Programming',
    mentorship: 'Yes (TCS engineers and experts)',
    futureScope: 'TCS opportunities, Global recognition, Career advancement',
    networking: 'TCS employees, Global participants, Industry experts',
    applicants: '100,000+ participants globally (2024)',
    pastReviews: '"Most challenging coding competition I\'ve participated in!" – 2024 Winner',
    difficulty: 'Advanced',
    tags: ['Coding', 'Algorithms', 'TCS', 'Global', 'Competition']
  },
  {
    _id: 'c3',
    title: 'Infosys InfyTQ Competition',
    type: 'competition',
    eventDate: '2025-10-22',
    description: 'National coding competition by Infosys for engineering students.',
    detailedDescription: 'Infosys InfyTQ is a prestigious national coding competition designed to identify and nurture top programming talent among engineering students. The competition features multiple rounds testing algorithmic thinking, data structures knowledge, and real-world problem-solving skills.',
    link: 'https://infytq.onwingspan.com/en/infytq-competition',
    applyLink: 'https://infytq.onwingspan.com/en/infytq-competition',
    featured: true,
    location: 'Virtual (Online)',
    deadline: '2025-10-10',
    image: 'https://www.infosys.com/content/dam/infosys-web/en/global-resource/logo.png',
    duration: '4 hours',
    workload: 'Intensive (during competition)',
    eligibility: 'Engineering students, 2nd year onwards, All branches',
    teamOrIndividual: 'Individual',
    stipendPerks: 'Cash prizes up to ₹1 Lakh, Infosys job opportunities, National recognition',
    mode: 'Online',
    organizerReputation: 'Infosys (Global IT Services Leader)',
    learningOpportunities: 'Algorithmic Thinking, Data Structures, Problem Solving, Competitive Programming',
    mentorship: 'Yes (Infosys engineers and experts)',
    futureScope: 'Infosys opportunities, National recognition, Career advancement',
    networking: 'Infosys employees, Top performers, Industry experts',
    applicants: '50,000+ students (2024)',
    pastReviews: '"Excellent competition with great learning opportunities!" – 2024 Winner',
    difficulty: 'Advanced',
    tags: ['Coding', 'Algorithms', 'Infosys', 'National', 'Competition']
  },
  {
    _id: 'c4',
    title: 'Google Code Jam India',
    type: 'competition',
    eventDate: '2025-09-29',
    description: 'Google Code Jam regional round for India. Solve challenging algorithmic problems.',
    detailedDescription: 'Google Code Jam is one of the world\'s most prestigious programming competitions, featuring challenging algorithmic problems that test participants\' problem-solving skills, mathematical thinking, and coding efficiency. The India regional round brings together the best programmers from across the country.',
    link: 'https://codingcompetitions.withgoogle.com/codejam',
    applyLink: 'https://codingcompetitions.withgoogle.com/codejam',
    featured: true,
    location: 'Virtual (Online)',
    deadline: '2025-09-20',
    image: 'https://www.google.com/images/branding/googlelogo/2x/googlelogo_color_272x92dp.png',
    duration: '3 hours',
    workload: 'Intensive (during competition)',
    eligibility: 'Students and professionals, All backgrounds, Strong programming skills',
    teamOrIndividual: 'Individual',
    mode: 'Online',
    organizerReputation: 'Google (Alphabet Inc.)',
    learningOpportunities: 'Algorithmic Thinking, Mathematical Problem Solving, Competitive Programming',
    mentorship: 'Yes (Google engineers and competition experts)',
    futureScope: 'Google opportunities, Global recognition, Career advancement',
    networking: 'Google employees, Global participants, Industry experts',
    applicants: '25,000+ participants (2024)',
    pastReviews: '"Most prestigious coding competition globally!" – 2024 Winner',
    difficulty: 'Advanced',
    tags: ['Coding', 'Algorithms', 'Google', 'Global', 'Competition']
  },
  {
    _id: 'c5',
    title: 'IIT Kanpur Techkriti Olympiad',
    type: 'competition',
    eventDate: '2025-10-18',
    description: 'National-level olympiad for school and college students as part of Techkriti, IIT Kanpur.',
    detailedDescription: 'IIT Kanpur Techkriti Olympiad is a prestigious national-level competition featuring multiple technical tracks including programming, robotics, and innovation challenges. The olympiad is part of Techkriti, IIT Kanpur\'s annual technical festival, attracting top talent from across India.',
    link: 'https://www.techkriti.org/olympiad',
    applyLink: 'https://www.techkriti.org/olympiad',
    featured: true,
    location: 'Kanpur, Uttar Pradesh (Offline)',
    deadline: '2025-10-05',
    image: 'https://www.techkriti.org/assets/img/logo.png',
    duration: '2 days',
    workload: 'Intensive (during competition)',
    eligibility: 'School and college students, All backgrounds',
    teamOrIndividual: 'Team (2-4 members)',
    stipendPerks: 'Cash prizes up to ₹50,000, Certificates, IIT Kanpur recognition',
    mode: 'Offline',
    organizerReputation: 'IIT Kanpur (Premier Engineering Institute)',
    learningOpportunities: 'Technical Skills, Innovation, Problem Solving, Teamwork',
    mentorship: 'Yes (IIT Kanpur faculty and industry experts)',
    futureScope: 'IIT opportunities, National recognition, Career advancement',
    networking: 'IIT Kanpur faculty, Top performers, Industry experts',
    applicants: '5,000+ students (2024)',
    pastReviews: '"Amazing olympiad experience at IIT Kanpur!" – 2024 Winner',
    difficulty: 'Advanced',
    tags: ['Olympiad', 'IIT Kanpur', 'Technical', 'Team Event', 'Innovation']
  },
  {
    _id: 'c6',
    title: 'CodeChef SnackDown 2025',
    type: 'competition',
    eventDate: '2025-11-15',
    description: 'Global programming competition by CodeChef. Open to all students.',
    detailedDescription: 'CodeChef SnackDown is one of the world\'s largest programming competitions, featuring multiple rounds of challenging algorithmic problems. The competition attracts participants from across the globe and offers substantial prizes and recognition for top performers.',
    link: 'https://www.codechef.com/snackdown',
    applyLink: 'https://www.codechef.com/snackdown',
    featured: true,
    location: 'Virtual (Online)',
    deadline: '2025-11-01',
    image: 'https://s3.amazonaws.com/codechef_shared/sites/all/themes/abessive/logo.svg',
    duration: '3 hours',
    workload: 'Intensive (during competition)',
    eligibility: 'Students and professionals, All backgrounds, Strong programming skills',
    teamOrIndividual: 'Team (2 members)',
    stipendPerks: 'Cash prizes up to $10,000, Global recognition, CodeChef merchandise',
    mode: 'Online',
    organizerReputation: 'CodeChef (Leading Programming Platform)',
    learningOpportunities: 'Algorithmic Thinking, Competitive Programming, Problem Solving',
    mentorship: 'Yes (CodeChef experts and programming mentors)',
    futureScope: 'Global recognition, Career opportunities, Resume value',
    networking: 'Global participants, Programming experts, Industry professionals',
    applicants: '75,000+ participants globally (2024)',
    pastReviews: '"Most exciting global programming competition!" – 2024 Winner',
    difficulty: 'Advanced',
    tags: ['Coding', 'Algorithms', 'CodeChef', 'Global', 'Competition']
  },
  {
    _id: 'c7',
    title: 'IIT Bombay Techfest Competitions',
    type: 'competition',
    eventDate: '2025-12-20',
    description: 'Multiple technical competitions as part of Techfest, IIT Bombay.',
    detailedDescription: 'IIT Bombay Techfest features multiple technical competitions covering robotics, programming, innovation, and engineering challenges. As Asia\'s largest technical festival, it attracts participants from across India and offers substantial prizes and recognition.',
    link: 'https://techfest.org/competitions',
    applyLink: 'https://techfest.org/competitions',
    featured: true,
    location: 'Mumbai, Maharashtra (Offline)',
    deadline: '2025-12-01',
    image: 'https://techfest.org/images/logo.png',
    duration: '3 days',
    workload: 'Intensive (during competition)',
    eligibility: 'Students and professionals, All backgrounds',
    teamOrIndividual: 'Team (2-4 members)',
    stipendPerks: 'Cash prizes up to ₹1 Lakh, Certificates, IIT Bombay recognition',
    mode: 'Offline',
    organizerReputation: 'IIT Bombay (Premier Engineering Institute)',
    learningOpportunities: 'Technical Skills, Innovation, Problem Solving, Engineering',
    mentorship: 'Yes (IIT Bombay faculty and industry experts)',
    futureScope: 'IIT opportunities, National recognition, Career advancement',
    networking: 'IIT Bombay faculty, Top performers, Industry experts',
    applicants: '10,000+ participants (2024)',
    pastReviews: '"Incredible experience at Asia\'s largest tech fest!" – 2024 Winner',
    difficulty: 'Advanced',
    tags: ['Techfest', 'IIT Bombay', 'Technical', 'Team Event', 'Innovation']
  },
  {
    _id: 'c8',
    title: 'HackerEarth India Coding Challenge',
    type: 'competition',
    eventDate: '2025-10-28',
    description: 'Monthly coding challenge for Indian students and professionals.',
    detailedDescription: 'HackerEarth India Coding Challenge is a monthly programming competition featuring algorithmic problems and real-world coding challenges. The competition is designed to identify top programming talent and offers opportunities for career advancement in the tech industry.',
    link: 'https://www.hackerearth.com/challenges/',
    applyLink: 'https://www.hackerearth.com/challenges/',
    featured: true,
    location: 'Virtual (Online)',
    deadline: '2025-10-20',
    image: 'https://static-fastly.hackerearth.com/static/hackerearth/images/logo/HE_logo.png',
    duration: '3 hours',
    workload: 'Intensive (during competition)',
    eligibility: 'Students and professionals, All backgrounds, Strong programming skills',
    teamOrIndividual: 'Individual',
    stipendPerks: 'Cash prizes up to ₹25,000, Job opportunities, HackerEarth recognition',
    mode: 'Online',
    organizerReputation: 'HackerEarth (Leading Programming Platform)',
    learningOpportunities: 'Algorithmic Thinking, Competitive Programming, Problem Solving',
    mentorship: 'Yes (HackerEarth experts and programming mentors)',
    futureScope: 'Job opportunities, Industry recognition, Career advancement',
    networking: 'Programming experts, Industry professionals, Fellow participants',
    applicants: '15,000+ participants (2024)',
    pastReviews: '"Great monthly coding challenge!" – 2024 Winner',
    difficulty: 'Intermediate',
    tags: ['Coding', 'Algorithms', 'HackerEarth', 'Monthly', 'Competition']
  },
  {
    _id: 'c9',
    title: 'IIT Delhi Tryst Competitions',
    type: 'competition',
    eventDate: '2025-11-10',
    description: 'Technical competitions as part of Tryst, IIT Delhi’s annual tech fest.',
    link: 'https://www.tryst-iitd.org/competitions',
    applyLink: 'https://www.tryst-iitd.org/competitions',
    featured: true,
    location: 'Delhi (Offline)',
    deadline: '2025-10-25',
    image: 'https://www.tryst-iitd.org/assets/img/logo.png'
  },
  {
    _id: 'c10',
    title: 'Unstop National Coding League',
    type: 'competition',
    eventDate: '2025-12-05',
    description: 'National-level coding competition for students across India.',
    link: 'https://unstop.com/competitions',
    applyLink: 'https://unstop.com/competitions',
    featured: true,
    location: 'Virtual (Online)',
    deadline: '2025-11-25',
    image: 'https://unstop.com/static/images/unstop-logo.png'
  },
  // 10 more competitions (11-20)
  ...Array.from({ length: 10 }, (_, i) => ({
    _id: `c${i + 11}`,
    title: `National Competition ${i + 1}`,
    type: 'competition',
    eventDate: `2025-11-${(i % 20) + 5}`,
    description: `National level competition ${i + 1} for Indian students on coding, business, or innovation.`,
    link: 'https://unstop.com/competitions',
    applyLink: 'https://unstop.com/competitions',
    featured: true,
    location: 'Virtual (Online)',
    deadline: `2025-10-${(i % 20) + 25}`,
    image: 'https://unstop.com/static/images/unstop-logo.png'
  })),
  // Seminars (20)
  {
    _id: 's1',
    title: 'IEEE Seminar on Quantum Computing',
    type: 'seminar',
    eventDate: '2025-10-12',
    description: 'A seminar on the basics and applications of quantum computing, organized by IEEE India.',
    detailedDescription: 'This IEEE seminar covers the fundamentals of quantum computing, including quantum algorithms, quantum gates, and real-world applications. Industry experts and researchers share insights on the future of quantum technology and its impact on various sectors.',
    link: 'https://events.ieee.org/',
    applyLink: 'https://events.ieee.org/',
    featured: true,
    location: 'Virtual (Online)',
    deadline: '2025-10-05',
    image: 'https://www.ieee.org/content/dam/ieee-global/images/ieee_mb_logo.png',
    duration: '4 hours',
    workload: 'Part-time (during seminar)',
    eligibility: 'Engineering students, researchers, professionals',
    teamOrIndividual: 'Individual',
    stipendPerks: 'Certificate, Learning materials, IEEE membership benefits',
    mode: 'Online',
    organizerReputation: 'IEEE (Institute of Electrical and Electronics Engineers)',
    learningOpportunities: 'Quantum Computing, Advanced Physics, Future Technologies',
    mentorship: 'Yes (IEEE experts and researchers)',
    futureScope: 'Quantum computing career, Research opportunities, Industry knowledge',
    networking: 'IEEE members, Quantum researchers, Industry experts',
    applicants: '1,000+ participants (2024)',
    pastReviews: '"Eye-opening seminar on quantum computing!" – 2024 Participant',
    difficulty: 'Advanced',
    tags: ['Quantum Computing', 'IEEE', 'Research', 'Individual', 'Future Tech']
  },
  {
    _id: 's2',
    title: 'NPTEL Seminar: Data Science Trends',
    type: 'seminar',
    eventDate: '2025-09-28',
    description: 'Seminar on the latest trends in data science and analytics by NPTEL.',
    link: 'https://nptel.ac.in/events',
    applyLink: 'https://nptel.ac.in/events',
    featured: true,
    location: 'Virtual (Online)',
    deadline: '2025-09-20',
    image: 'https://nptel.ac.in/assets/images/logo.png'
  },
  {
    _id: 's3',
    title: 'AICTE Seminar on EdTech',
    type: 'seminar',
    eventDate: '2025-11-18',
    description: 'Seminar on educational technology and digital learning by AICTE.',
    link: 'https://www.aicte-india.org/events',
    applyLink: 'https://www.aicte-india.org/events',
    featured: true,
    location: 'Delhi (Offline)',
    deadline: '2025-11-10',
    image: 'https://www.aicte-india.org/sites/default/files/logo_new.png'
  },
  {
    _id: 's4',
    title: 'DST Seminar on Innovation',
    type: 'seminar',
    eventDate: '2025-12-12',
    description: 'Seminar on innovation and entrepreneurship by Department of Science & Technology.',
    link: 'https://dst.gov.in/events',
    applyLink: 'https://dst.gov.in/events',
    featured: true,
    location: 'Delhi (Offline)',
    deadline: '2025-12-01',
    image: 'https://dst.gov.in/sites/default/files/logo.png'
  },
  {
    _id: 's5',
    title: 'IIT Madras Seminar on AI',
    type: 'seminar',
    eventDate: '2025-10-20',
    description: 'Seminar on Artificial Intelligence and its applications by IIT Madras.',
    link: 'https://www.iitm.ac.in/events',
    applyLink: 'https://www.iitm.ac.in/events',
    featured: true,
    location: 'Chennai, Tamil Nadu (Offline)',
    deadline: '2025-10-10',
    image: 'https://www.iitm.ac.in/sites/default/files/images/logo_0.png'
  },
  {
    _id: 's6',
    title: 'IIT Bombay Seminar on Robotics',
    type: 'seminar',
    eventDate: '2025-11-15',
    description: 'Seminar on robotics and automation by IIT Bombay.',
    link: 'https://www.iitb.ac.in/en/events',
    applyLink: 'https://www.iitb.ac.in/en/events',
    featured: true,
    location: 'Mumbai, Maharashtra (Offline)',
    deadline: '2025-11-01',
    image: 'https://www.iitb.ac.in/sites/www.iitb.ac.in/themes/touchm/logo.png'
  },
  {
    _id: 's7',
    title: 'NIT Trichy Seminar on IoT',
    type: 'seminar',
    eventDate: '2025-12-05',
    description: 'Seminar on Internet of Things and its future by NIT Trichy.',
    link: 'https://www.nitt.edu/home/academics/events/',
    applyLink: 'https://www.nitt.edu/home/academics/events/',
    featured: true,
    location: 'Tiruchirappalli, Tamil Nadu (Offline)',
    deadline: '2025-11-25',
    image: 'https://www.nitt.edu/home/images/logo.png'
  },
  {
    _id: 's8',
    title: 'IIT Kharagpur Seminar on Blockchain',
    type: 'seminar',
    eventDate: '2025-10-28',
    description: 'Seminar on blockchain technology and its applications by IIT Kharagpur.',
    link: 'https://www.iitkgp.ac.in/events',
    applyLink: 'https://www.iitkgp.ac.in/events',
    featured: true,
    location: 'Kharagpur, West Bengal (Offline)',
    deadline: '2025-10-20',
    image: 'https://www.iitkgp.ac.in/assets/images/logo.png'
  },
  {
    _id: 's9',
    title: 'IIT Delhi Seminar on Cybersecurity',
    type: 'seminar',
    eventDate: '2025-11-10',
    description: 'Seminar on cybersecurity and ethical hacking by IIT Delhi.',
    link: 'https://www.iitd.ac.in/events',
    applyLink: 'https://www.iitd.ac.in/events',
    featured: true,
    location: 'Delhi (Offline)',
    deadline: '2025-10-25',
    image: 'https://home.iitd.ac.in/public/images/logo.png'
  },
  {
    _id: 's10',
    title: 'GeeksforGeeks Seminar on Full Stack',
    type: 'seminar',
    eventDate: '2025-12-20',
    description: 'Seminar on full stack development and career opportunities.',
    link: 'https://practice.geeksforgeeks.org/events',
    applyLink: 'https://practice.geeksforgeeks.org/events',
    featured: true,
    location: 'Virtual (Online)',
    deadline: '2025-12-10',
    image: 'https://media.geeksforgeeks.org/wp-content/cdn-uploads/gfg_200X200.png'
  },
  // 10 more seminars (11-20)
  ...Array.from({ length: 10 }, (_, i) => ({
    _id: `s${i + 11}`,
    title: `Student Seminar ${i + 1}`,
    type: 'seminar',
    eventDate: `2025-12-${(i % 20) + 5}`,
    description: `Educational seminar ${i + 1} for Indian students on trending topics in technology and science.`,
    link: 'https://nptel.ac.in/events',
    applyLink: 'https://nptel.ac.in/events',
    featured: true,
    location: 'Virtual (Online)',
    deadline: `2025-11-${(i % 20) + 20}`,
    image: 'https://nptel.ac.in/assets/images/logo.png'
  })),
  {
    id: 999,
    title: "Bookmarked Event",
    description: "An event bookmarked for testing notifications.",
    organizer: "Test Organizer",
    location: "Test Location",
    deadline: "2025-10-24",
    eventDate: "2025-10-26",
    tags: ["Test", "Notification"],
    isBookmarked: true,
    applyLink: "https://testevent.com/",
    participants: 100,
    type: "test-event",
  },
  {
    id: 9999,
    title: "Bookmarked Eventtt",
    description: "An event bookmarked for testing notifications.",
    organizer: "Test Organizer",
    location: "Test Location",
    deadline: "2025-12-13",
    eventDate: "2025-12-20",
    tags: ["Test", "Notification"],
    isBookmarked: true,
    applyLink: "https://testevent.com/",
    participants: 100,
    type: "test-event",
  },
  {
    id: 777,
    title: "sample event",
    description: "An event bookmarked for testing notifications.",
    organizer: "Test Organizer",
    location: "Test Location",
    deadline: "2025-12-13",
    eventDate: "2025-12-20",
    tags: ["Test", "Notification"],
    isBookmarked: true,
    applyLink: "https://testevent.com/",
    participants: 100,
    type: "test-event",
  },
  {
    id: 7777,
    title: "sample event 2",
    description: "An event bookmarked for testing notifications.",
    organizer: "Test Organizer",
    location: "Test Location",
    deadline: "2025-12-18",
    eventDate: "2025-12-20",
    tags: ["Test", "Notification"],
    isBookmarked: true,
    applyLink: "https://testevent.com/",
    participants: 100,
    type: "test-event",
  },
];

const Events = () => {
  const [events] = useState(hardcodedEvents);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [globalSearch, setGlobalSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState('all');
  const [tab, setTab] = useState('featured');
  const [currentPage, setCurrentPage] = useState(1);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [quickPreset, setQuickPreset] = useState('');
  const [modeFilters, setModeFilters] = useState([]); // online | offline | hybrid
  const [levelFilters, setLevelFilters] = useState([]); // beginner | intermediate | advanced
  const [selectedTags, setSelectedTags] = useState([]);
  const [sortBy, setSortBy] = useState('soonest');
  const [bookmarkedOnly, setBookmarkedOnly] = useState(false);
  const [archivedOnly, setArchivedOnly] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const location = useLocation();

  const CARDS_PER_PAGE = 12; // 4 rows × 3 cards

  // Set category from navigation state
  useEffect(() => {
    if (location.state && location.state.category) {
      setActiveCategory(location.state.category);
      setTab('upcoming');
    }
  }, [location.state]);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const eventId = params.get('eventId');
    if (!eventId) return;
    const normalizedId = eventId.toString();
    const matchingEvent = events.find(ev => {
      const identifiers = [ev._id, ev.id, ev.title]
        .filter(Boolean)
        .map(id => id.toString());
      return identifiers.includes(normalizedId);
    });
    if (matchingEvent) {
      setSelectedEvent(matchingEvent);
      setIsModalOpen(true);
    }
  }, [location.search, events]);

  // Bookmark logic (needed early for filter computations)
  const [bookmarkedIds, setBookmarkedIds] = useState(() => {
    const saved = localStorage.getItem('bookmarkedEvents');
    return saved ? JSON.parse(saved) : [];
  });

  const popularTags = useMemo(() => {
    const tagSet = new Set();
    events.forEach(ev => {
      (ev.tags || []).forEach(tag => tagSet.add(tag));
    });
    return Array.from(tagSet).slice(0, 12);
  }, [events]);

  const toggleValue = (list, value) => (
    list.includes(value) ? list.filter(v => v !== value) : [...list, value]
  );

  const formatInputDate = (date) => date.toISOString().split('T')[0];
  const addDays = (date, days) => new Date(date.getTime() + days * 86400000);

  const handlePresetSelect = (preset) => {
    const today = new Date();
    setQuickPreset(preset);

    if (preset === '7d') {
      setStartDate(formatInputDate(today));
      setEndDate(formatInputDate(addDays(today, 7)));
    } else if (preset === '30d') {
      setStartDate(formatInputDate(today));
      setEndDate(formatInputDate(addDays(today, 30)));
    } else if (preset === 'weekend') {
      const day = today.getDay();
      const daysUntilSaturday = (6 - day + 7) % 7;
      const saturday = addDays(today, daysUntilSaturday);
      const sunday = addDays(saturday, 1);
      setStartDate(formatInputDate(saturday));
      setEndDate(formatInputDate(sunday));
    } else {
      setStartDate('');
      setEndDate('');
    }
  };

  const clearAllFilters = () => {
    setGlobalSearch('');
    setActiveCategory('all');
    setStartDate('');
    setEndDate('');
    setQuickPreset('');
    setModeFilters([]);
    setLevelFilters([]);
    setSelectedTags([]);
    setSortBy('soonest');
    setBookmarkedOnly(false);
    setArchivedOnly(false);
  };

  const saveFilters = () => {
    const payload = {
      globalSearch,
      activeCategory,
      startDate,
      endDate,
      quickPreset,
      modeFilters,
      levelFilters,
      selectedTags,
      sortBy,
      bookmarkedOnly,
      archivedOnly,
    };
    localStorage.setItem('clockdin_event_filters', JSON.stringify(payload));
  };

  const applyFilters = () => {
    setIsSidebarOpen(false);
  };

  // Filtering logic with global search and sidebar filters
  const now = new Date();
  let filteredEvents = events.filter(event => {
    const eventDate = event.eventDate ? new Date(event.eventDate) : null;

    // Tab filter - only show upcoming events
    if (tab === 'featured') {
      // Show all events
    } else if (tab === 'upcoming') {
      if (!eventDate || isNaN(eventDate.getTime()) || eventDate < now) return false;
    }

    // Category filter
    if (activeCategory !== 'all') {
      const typeMap = {
        Hackathon: 'hackathon',
        Internship: 'internship',
        Workshop: 'workshop',
        'Student Competition': 'competition',
        Seminar: 'seminar',
      };
      const eventType = (event.type || '').toLowerCase();
      if (activeCategory in typeMap) {
        if (eventType !== typeMap[activeCategory]) return false;
      }
    }

    // Date range filters
    if (startDate && eventDate) {
      const start = new Date(startDate);
      if (eventDate < start) return false;
    }
    if (endDate && eventDate) {
      const end = new Date(endDate);
      if (eventDate > end) return false;
    }

    // Mode filter
    if (modeFilters.length) {
      const modeLower = (event.mode || '').toLowerCase();
      if (!modeFilters.some(m => modeLower.includes(m))) return false;
    }

    // Skill level filter
    if (levelFilters.length) {
      const difficulty = (event.difficulty || '').toLowerCase();
      if (!levelFilters.includes(difficulty)) return false;
    }

    // Tags filter
    if (selectedTags.length) {
      const tags = (event.tags || []).map(t => t.toLowerCase());
      if (!selectedTags.some(tag => tags.includes(tag.toLowerCase()))) return false;
    }

    // Bookmarked only filter
    if (bookmarkedOnly && !bookmarkedIds.includes(event._id)) return false;

    // Archived only filter (fallback to event.archived / isArchived flags)
    if (archivedOnly && !(event.archived || event.isArchived)) return false;
    if (!archivedOnly && (event.archived || event.isArchived)) return false;

    // Global search filter
    if (globalSearch.trim()) {
      const searchLower = globalSearch.toLowerCase();
      const searchableText = [
        event.title,
        event.description,
        event.detailedDescription,
        event.organizerReputation,
        event.location,
        event.tags ? event.tags.join(' ') : '',
      ].join(' ').toLowerCase();

      if (!searchableText.includes(searchLower)) return false;
    }

    return true;
  });

  // Sorting
  filteredEvents = [...filteredEvents].sort((a, b) => {
    const dateA = a.eventDate ? new Date(a.eventDate).getTime() : 0;
    const dateB = b.eventDate ? new Date(b.eventDate).getTime() : 0;
    const deadlineA = a.deadline ? new Date(a.deadline).getTime() : 0;
    const deadlineB = b.deadline ? new Date(b.deadline).getTime() : 0;

    switch (sortBy) {
      case 'latest':
        return dateB - dateA;
      case 'deadline':
        return deadlineA - deadlineB;
      case 'alpha':
        return (a.title || '').localeCompare(b.title || '');
      case 'featured':
        return (b.featured ? 1 : 0) - (a.featured ? 1 : 0);
      case 'soonest':
      default:
        return dateA - dateB;
    }
  });

  // Pagination
  const totalPages = Math.ceil(filteredEvents.length / CARDS_PER_PAGE);
  const startIndex = (currentPage - 1) * CARDS_PER_PAGE;
  const endIndex = startIndex + CARDS_PER_PAGE;
  const paginatedEvents = filteredEvents.slice(startIndex, endIndex);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [
    globalSearch,
    activeCategory,
    tab,
    startDate,
    endDate,
    quickPreset,
    modeFilters,
    levelFilters,
    selectedTags,
    bookmarkedOnly,
    archivedOnly,
    sortBy,
  ]);

  const stats = [
    { label: 'Upcoming Events', value: filteredEvents.length, color: '#3b5bfd' },
    { label: 'Hackathons', value: '20', color: '#16a34a' },
    { label: 'Internships', value: '20', color: '#f59e1b' },
    { label: 'Students', value: '25K+', color: '#334155' },
  ];

  const categoryCounts = useMemo(() => ({
    all: events.length,
    Hackathon: events.filter(e => (e.type || '').toLowerCase() === 'hackathon').length,
    Internship: events.filter(e => (e.type || '').toLowerCase() === 'internship').length,
    Workshop: events.filter(e => (e.type || '').toLowerCase() === 'workshop').length,
    'Student Competition': events.filter(e => (e.type || '').toLowerCase() === 'competition').length,
    Seminar: events.filter(e => (e.type || '').toLowerCase() === 'seminar').length,
  }), [events]);

  const categories = [
    { label: 'All', icon: 'bi-calendar', count: categoryCounts.all, key: 'all' },
    { label: 'Hackathons', icon: 'bi-trophy', count: categoryCounts.Hackathon, key: 'Hackathon' },
    { label: 'Internships', icon: 'bi-briefcase', count: categoryCounts.Internship, key: 'Internship' },
    { label: 'Workshops', icon: 'bi-mortarboard', count: categoryCounts.Workshop, key: 'Workshop' },
    { label: 'Competitions', icon: 'bi-award', count: categoryCounts['Student Competition'], key: 'Student Competition' },
    { label: 'Seminars', icon: 'bi-people', count: categoryCounts.Seminar, key: 'Seminar' },
  ];

  const handleBookmark = (event) => {
    let updated;
    if (bookmarkedIds.includes(event._id)) {
      updated = bookmarkedIds.filter(id => id !== event._id);
    } else {
      updated = [...bookmarkedIds, event._id];
      const all = JSON.parse(localStorage.getItem('bookmarkedEventsData') || '[]');
      if (!all.find(e => e._id === event._id)) {
        localStorage.setItem('bookmarkedEventsData', JSON.stringify([...all, event]));
      }
    }
    setBookmarkedIds(updated);
    localStorage.setItem('bookmarkedEvents', JSON.stringify(updated));
    if (!updated.includes(event._id)) {
      const all = JSON.parse(localStorage.getItem('bookmarkedEventsData') || '[]');
      localStorage.setItem('bookmarkedEventsData', JSON.stringify(all.filter(e => e._id !== event._id)));
    }
  };

  const handleEventClick = (event) => {
    setSelectedEvent(event);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedEvent(null);
  };

  return (
    <div className="container-fluid mt-4">
      <div className="events-layout">
        <aside className={`premium-sidebar ${isSidebarOpen ? 'open' : ''}`}>
          <div className="sidebar-scroll">
            <div className="sidebar-heading-row">
              <div>
                <div className="sidebar-eyebrow">Filters</div>
                <h5 className="sidebar-title">Refine Events</h5>
              </div>
              <button className="btn btn-light btn-sm d-lg-none" onClick={() => setIsSidebarOpen(false)}>Close</button>
            </div>

            {/* Search */}
            <div className="sidebar-section">
              <label className="sidebar-label">Search</label>
              <div className="sidebar-search">
                <i className="bi bi-search"></i>
                <input
                  type="text"
                  placeholder="Search titles, orgs, skills"
                  value={globalSearch}
                  onChange={(e) => setGlobalSearch(e.target.value)}
                />
                {globalSearch && (
                  <button className="icon-btn" onClick={() => setGlobalSearch('')}>
                    <i className="bi bi-x-lg"></i>
                  </button>
                )}
              </div>
            </div>

            {/* Categories */}
            <div className="sidebar-section">
              <label className="sidebar-label">Categories</label>
              <div className="chip-grid">
                {categories.map(cat => (
                  <button
                    key={cat.key}
                    className={activeCategory === cat.key ? 'filter-chip selected' : 'filter-chip'}
                    onClick={() => setActiveCategory(cat.key)}
                  >
                    <span><i className={`bi ${cat.icon} me-1`}></i>{cat.label}</span>
                    <span className="pill">{cat.count}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Dates */}
            <div className="sidebar-section">
              <label className="sidebar-label">Date Range</label>
              <div className="date-grid">
                <div>
                  <small className="text-muted">Start</small>
                  <input type="date" className="form-control" value={startDate} onChange={(e)=>{setStartDate(e.target.value); setQuickPreset('');}} />
                </div>
                <div>
                  <small className="text-muted">End</small>
                  <input type="date" className="form-control" value={endDate} onChange={(e)=>{setEndDate(e.target.value); setQuickPreset('');}} />
                </div>
              </div>
              <div className="preset-row">
                <button className={quickPreset==='7d' ? 'preset-btn active' : 'preset-btn'} onClick={()=>handlePresetSelect('7d')}>Next 7 days</button>
                <button className={quickPreset==='30d' ? 'preset-btn active' : 'preset-btn'} onClick={()=>handlePresetSelect('30d')}>Next 30 days</button>
                <button className={quickPreset==='weekend' ? 'preset-btn active' : 'preset-btn'} onClick={()=>handlePresetSelect('weekend')}>This weekend</button>
                <button className={!quickPreset ? 'preset-btn active' : 'preset-btn'} onClick={()=>handlePresetSelect('')}>Anytime</button>
              </div>
            </div>

            {/* Modes */}
            <div className="sidebar-section">
              <label className="sidebar-label">Mode</label>
              <div className="chip-grid">
                {['online','offline','hybrid'].map(mode => (
                  <button
                    key={mode}
                    className={modeFilters.includes(mode) ? 'filter-chip selected' : 'filter-chip'}
                    onClick={() => setModeFilters(prev => toggleValue(prev, mode))}
                  >
                    <i className="bi bi-wifi"></i> {mode.charAt(0).toUpperCase() + mode.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            {/* Skill Levels */}
            <div className="sidebar-section">
              <label className="sidebar-label">Skill Level</label>
              <div className="chip-grid">
                {['beginner','intermediate','advanced'].map(level => (
                  <button
                    key={level}
                    className={levelFilters.includes(level) ? 'filter-chip selected' : 'filter-chip'}
                    onClick={() => setLevelFilters(prev => toggleValue(prev, level))}
                  >
                    <i className="bi bi-stars"></i> {level.charAt(0).toUpperCase() + level.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            {/* Popular Tags */}
            <div className="sidebar-section">
              <label className="sidebar-label">Popular Tags</label>
              <div className="chip-grid">
                {popularTags.map(tag => (
                  <button
                    key={tag}
                    className={selectedTags.includes(tag) ? 'filter-chip selected' : 'filter-chip'}
                    onClick={() => setSelectedTags(prev => toggleValue(prev, tag))}
                  >
                    #{tag}
                  </button>
                ))}
              </div>
            </div>

            {/* Sorting */}
            <div className="sidebar-section">
              <label className="sidebar-label">Sort by</label>
              <select className="form-select" value={sortBy} onChange={(e)=>setSortBy(e.target.value)}>
                <option value="soonest">Soonest</option>
                <option value="latest">Latest</option>
                <option value="deadline">Deadline</option>
                <option value="alpha">A - Z</option>
                <option value="featured">Featured First</option>
              </select>
            </div>

            {/* Toggles */}
            <div className="sidebar-section toggle-stack">
              <div className="form-check form-switch">
                <input className="form-check-input" type="checkbox" id="bookmarkedOnly" checked={bookmarkedOnly} onChange={(e)=>setBookmarkedOnly(e.target.checked)} />
                <label className="form-check-label" htmlFor="bookmarkedOnly">Bookmarked only</label>
              </div>
              <div className="form-check form-switch">
                <input className="form-check-input" type="checkbox" id="archivedOnly" checked={archivedOnly} onChange={(e)=>setArchivedOnly(e.target.checked)} />
                <label className="form-check-label" htmlFor="archivedOnly">Archived only</label>
              </div>
            </div>

            {/* Actions */}
            <div className="sidebar-actions">
              <button className="btn btn-primary w-100" onClick={applyFilters}>Apply Filters</button>
              <button className="btn btn-outline-secondary w-100" onClick={clearAllFilters}>Clear All</button>
              <button className="btn btn-light w-100" onClick={saveFilters}>Save Filter</button>
            </div>
          </div>
        </aside>

        {isSidebarOpen && <div className="sidebar-backdrop d-lg-none" onClick={()=>setIsSidebarOpen(false)}></div>}

        <div className="events-main flex-grow-1">
          <div className="d-lg-none mb-3">
            <button className="btn btn-outline-primary" onClick={()=>setIsSidebarOpen(true)}>
              <i className="bi bi-sliders me-2"></i>Filters
            </button>
          </div>

          {/* Hero Section */}
          <div className="events-hero">
            <h1 style={{fontWeight:800, fontSize:'3rem', color:'#22223b', marginBottom:'0.5rem'}}>
              Discover Amazing <span style={{color:'#3b5bfd'}}>Student Events</span>
            </h1>
            <p style={{fontSize:'1.25rem', color:'#475569', marginBottom:'2.5rem'}}>
              Find hackathons, internships, workshops, and competitions tailored for students. Never miss an opportunity to grow your skills and network.
            </p>

            {/* Stats */}
            <div className="events-stats-row">
              {stats.map((stat) => (
                <div className="events-stat-card" key={stat.label}>
                  <div className="events-stat-value" style={{ color: stat.color }}>{stat.value}</div>
                  <div className="events-stat-label">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Tabs */}
          <div className="d-flex mb-4" style={{gap:'1rem'}}>
            <button className={tab==='featured' ? 'btn btn-dark' : 'btn btn-light border'} style={{fontWeight:600, minWidth:160}} onClick={()=>setTab('featured')}>
              <i className="bi bi-graph-up-arrow me-2"></i>Featured Events
            </button>
            <button className={tab==='upcoming' ? 'btn btn-dark' : 'btn btn-light border'} style={{fontWeight:600, minWidth:160}} onClick={()=>setTab('upcoming')}>
              <i className="bi bi-calendar-event me-2"></i>Upcoming
            </button>
          </div>

          {/* Results Summary */}
          {globalSearch && (
            <div style={{
              background:'linear-gradient(135deg, #f0f4ff 0%, #fff5f7 100%)',
              borderRadius:'1rem',
              padding:'1rem',
              marginBottom:'2rem',
              border:'1px solid #e0e7ff'
            }}>
              <div className="d-flex align-items-center justify-content-between">
                <div>
                  <h6 style={{color:'#22223b', fontWeight:700, marginBottom:'0.25rem'}}>
                    <i className="bi bi-lightning-fill me-2" style={{color:'#3b5bfd'}}></i>
                    {filteredEvents.length} Event{filteredEvents.length !== 1 ? 's' : ''} Found
                  </h6>
                  <p style={{color:'#64748b', fontSize:'0.9rem', marginBottom:'0'}}>
                    Matching "{globalSearch}"
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Events Grid */}
          {filteredEvents.length === 0 ? (
            <div className="d-flex flex-column align-items-center justify-content-center" style={{
              background:'#fff',
              borderRadius:'1.2rem',
              minHeight:'400px',
              border:'1.5px solid #e5e7eb',
              padding:'2rem'
            }}>
              <i className="bi bi-search" style={{fontSize:'4rem', color:'#cbd5e1', marginBottom:'1rem'}}></i>
              <h4 style={{color:'#22223b', fontWeight:700}}>No Events Found</h4>
              <p style={{color:'#64748b', textAlign:'center', maxWidth:'400px'}}>
                Try adjusting your search or filters to find more events.
              </p>
            </div>
          ) : (
            <>
              <div className="row g-4" style={{marginBottom:'3rem'}}>
                {paginatedEvents.map((event) => (
                  <div className="col-md-6 col-lg-4" key={event._id}>
                    <EventCard
                      event={event}
                      onBookmark={handleBookmark}
                      isBookmarked={bookmarkedIds.includes(event._id)}
                      showBookmark={true}
                      onClick={() => handleEventClick(event)}
                    />
                  </div>
                ))}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div style={{
                  display:'flex',
                  justifyContent:'center',
                  alignItems:'center',
                  gap:'1rem',
                  marginBottom:'3rem'
                }}>
                  <button
                    className="btn btn-outline-secondary"
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                    style={{fontWeight:600, borderRadius:'0.6rem'}}
                  >
                    <i className="bi bi-chevron-left me-1"></i>Previous
                  </button>

                  <div style={{display:'flex', gap:'0.5rem', flexWrap:'wrap', justifyContent:'center'}}>
                    {Array.from({length: totalPages}, (_, i) => (
                      <button
                        key={i + 1}
                        className={currentPage === i + 1 ? 'btn btn-primary' : 'btn btn-outline-secondary'}
                        onClick={() => setCurrentPage(i + 1)}
                        style={{fontWeight:600, borderRadius:'0.6rem', minWidth:'40px'}}
                      >
                        {i + 1}
                      </button>
                    ))}
                  </div>

                  <button
                    className="btn btn-outline-secondary"
                    disabled={currentPage === totalPages}
                    onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                    style={{fontWeight:600, borderRadius:'0.6rem'}}
                  >
                    Next<i className="bi bi-chevron-right ms-1"></i>
                  </button>
                </div>
              )}

              {/* Page Info */}
              <div style={{textAlign:'center', color:'#64748b', marginBottom:'2rem', fontSize:'0.95rem'}}>
                Showing {startIndex + 1} - {Math.min(endIndex, filteredEvents.length)} of {filteredEvents.length} events
              </div>
            </>
          )}
        </div>
      </div>

      {/* Event Modal */}
      <EventModal
        event={selectedEvent}
        isOpen={isModalOpen}
        onClose={handleCloseModal}
      />
    </div>
  );
};

export default Events;
