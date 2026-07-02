require('dotenv').config();
const mongoose = require('mongoose');
const Event = require('../models/event.model');

const events = [
  {
    title: "Smart India Hackathon (SIH) 2026",
    organization: "Ministry of Education",
    category: "hackathon",
    skillLevel: "intermediate",
    tags: ["Hackathon", "Government", "AICTE", "NationalLevel"],
    description: "India's largest nationwide innovation hackathon, run by the Ministry of Education with AICTE. Solve real problem statements.",
    location: "Multiple nodal centres across India",
    deadline: new Date("2026-09-06T23:59:59Z"),
    duration: "36 hours",
    mode: "hybrid",
    link: "https://sih.gov.in/"
  },
  {
    title: "QUANTATHON 2026 (Quant-A-Thon)",
    organization: "Rajalakshmi Institute of Technology",
    category: "hackathon",
    skillLevel: "advanced",
    tags: ["QuantumComputing", "AI", "Cybersecurity", "IBM", "NationalQuantumMission"],
    description: "An elite 36-hour international hackathon on quantum computing, quantum+AI, and quantum cybersecurity.",
    location: "Rajalakshmi Institute of Tech, Chennai",
    eventDate: new Date("2026-07-30T09:00:00Z"),
    duration: "36 hours",
    mode: "hybrid",
    link: "https://internshala.com/competitions/quant-a-thon/"
  },
  {
    title: "Tata Technologies InnoVent 2026",
    organization: "Tata Technologies",
    category: "hackathon",
    skillLevel: "advanced",
    tags: ["EdgeAI", "Automotive", "Aerospace", "AWS", "EngineeringInnovation"],
    description: "A national engineering-innovation hackathon backed by AWS, where students submit AI-at-the-edge solutions.",
    location: "Hinjewadi campus, Pune",
    deadline: new Date("2026-07-05T23:59:59Z"),
    duration: "6 months",
    mode: "hybrid",
    link: "https://www.tatatechnologies.com/in/innovent/"
  },
  {
    title: "Women Who Master 2026",
    organization: "Aspire For Her",
    category: "hackathon",
    skillLevel: "beginner",
    tags: ["WomenInTech", "Hackathon", "AspireForHer", "Diversity"],
    description: "National hackathon/challenge for women in tech, run by Aspire For Her.",
    location: "Online",
    eventDate: new Date("2026-07-21T09:00:00Z"),
    duration: "Not specified",
    mode: "online",
    link: "https://internshala.com/competitions/women-who-master-2026/"
  },
  {
    title: "PM Internship Scheme (PMIS) 2026",
    organization: "Ministry of Corporate Affairs",
    category: "internship",
    skillLevel: "beginner",
    tags: ["GovernmentScheme", "Internship", "Stipend", "PanIndia", "EntryLevel"],
    description: "A Government of India programme placing youth 18-25 in internships at India's top 500 companies.",
    location: "Pan-India",
    duration: "6-9 months",
    mode: "offline",
    link: "https://pminternship.mca.gov.in/"
  },
  {
    title: "Client Success Internship",
    organization: "Internshala",
    category: "internship",
    skillLevel: "beginner",
    tags: ["Internship", "ClientSuccess", "Business", "NonTechnical", "Internshala"],
    description: "In-office internship at Internshala's own Gurgaon HQ coordinating with companies to fix and activate their internship listings.",
    location: "Gurgaon, Haryana",
    deadline: new Date("2026-07-10T23:59:59Z"),
    duration: "6 months",
    mode: "offline",
    link: "https://internshala.com/internship/detail/client-success-internship-in-gurgaon-at-internshala1766057329"
  },
  {
    title: "IBM Generative AI Hands-on Masterclass",
    organization: "IBM",
    category: "workshop",
    skillLevel: "advanced",
    tags: ["GenerativeAI", "IBM", "RAG", "LangChain", "AgentWorkflows"],
    description: "A hands-on technical lab hosted by IBM's Developer teams, covering IBM Granite foundation models and LangChain.",
    location: "IBM Office, Gurugram",
    eventDate: new Date("2026-07-11T09:00:00Z"),
    duration: "1 day",
    mode: "offline",
    link: "https://luma.com/192h2elm?utm_source=naila"
  },
  {
    title: "Data Privacy: Law & Compliance Workshop",
    organization: "LegalWiki",
    category: "workshop",
    skillLevel: "intermediate",
    tags: ["DataPrivacy", "DPDPAct", "GDPR", "Compliance", "LegalTech"],
    description: "A two-day live online certificate workshop by LegalWiki covering India's DPDP Act, GDPR, and AI-related privacy risks.",
    location: "Online (Zoom)",
    eventDate: new Date("2026-07-11T11:00:00Z"),
    duration: "2 days",
    mode: "online",
    link: "https://rzp.io/rzp/qAoyfK3"
  },
  {
    title: "Trilytics'26 - Analytics Case Competition",
    organization: "PGDBA Students",
    category: "competition",
    skillLevel: "intermediate",
    tags: ["Analytics", "CaseCompetition", "IIMCalcutta", "IITKharagpur", "SunPharma"],
    description: "A national analytics and business-case competition run by PGDBA students with Sun Pharma as title sponsor.",
    location: "Online",
    deadline: new Date("2026-07-04T23:59:59Z"),
    duration: "3 weeks",
    mode: "online",
    link: "https://unstop.com/competitions/trilytics26-analytics-case-competition-iim-calcutta-1700384"
  },
  {
    title: "ReEnvision 2026 - Case Study Competition",
    organization: "XLRI",
    category: "competition",
    skillLevel: "intermediate",
    tags: ["CaseStudy", "DigitalTransformation", "HumanAI", "XLRI", "Management"],
    description: "A case-study competition on digital transformation, themed Human AI - Synergy, hosted by XLRI.",
    location: "Online",
    deadline: new Date("2026-07-06T23:59:59Z"),
    duration: "1 week",
    mode: "online",
    link: "https://unstop.com/competitions/reenvision-2026-digital-horizon-case-study-competition-xavier-school-of-management-xlri-1699471"
  },
  {
    title: "DataHack Summit 2026",
    organization: "Analytics Vidhya",
    category: "seminar",
    skillLevel: "advanced",
    tags: ["AI", "GenAI", "AgenticAI", "AnalyticsVidhya", "Conference"],
    description: "The 7th edition of Analytics Vidhya's flagship AI conference - 4 days of keynotes and hands-on workshops.",
    location: "The Leela Bhartiya City, Bengaluru",
    eventDate: new Date("2026-08-05T09:00:00Z"),
    duration: "4 days",
    mode: "offline",
    link: "https://www.analyticsvidhya.com/datahacksummit/"
  },
  {
    title: "New Delhi Global Youth Summit 2026",
    organization: "NDGYS",
    category: "seminar",
    skillLevel: "beginner",
    tags: ["YouthLeadership", "Summit", "Vision2047", "Policy", "Networking"],
    description: "Billed as India's biggest youth-led leadership summit, bringing together students and innovators around India's Vision 2047.",
    location: "New Delhi",
    eventDate: new Date("2026-08-22T09:00:00Z"),
    duration: "Multi-day",
    mode: "offline",
    link: "https://www.globalyouthsummit.in/"
  }
];

async function seedCustomEvents() {
  try {
    await mongoose.connect(process.env.MONGO_URI || process.env.MONGODB_URI);
    console.log('Connected to MongoDB. Clearing old seeded events...');
    
    // Clear out everything first just in case there are duplicates from last run
    await Event.deleteMany({});
    
    console.log('Inserting 12 updated events with Tags and Skills...');
    const result = await Event.insertMany(events);
    console.log(`Successfully inserted ${result.length} events!`);
    
    console.log('Done!');
    process.exit(0);
  } catch (err) {
    console.error('Error:', err);
    process.exit(1);
  }
}

seedCustomEvents();
