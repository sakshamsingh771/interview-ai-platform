// Structured role/topic taxonomy for the "Start a new interview" form.
// Topics are curated per role so the suggestions stay relevant instead of
// showing an irrelevant flat list.

export const ROLE_GROUPS = [
  {
    label: "Tech Roles",
    roles: [
      "Frontend Developer",
      "Backend Engineer",
      "Full-Stack Engineer",
      "Mobile Developer (iOS/Android)",
      "AI/ML Engineer",
      "Data Scientist",
    ],
  },
  {
    label: "Non-Tech Roles",
    roles: ["Product Manager", "UI/UX Designer"],
  },
];

export const ROLES = ROLE_GROUPS.flatMap((group) => group.roles);

export const ROLE_TOPICS = {
  "Frontend Developer": [
    "React & State Management",
    "CSS/Tailwind",
    "Web Performance",
    "Accessibility",
    "JavaScript Fundamentals",
    "Testing",
  ],
  "Backend Engineer": [
    "System Design",
    "Databases",
    "APIs",
    "Authentication & Security",
    "Caching & Performance",
    "Microservices",
  ],
  "Full-Stack Engineer": [
    "System Design",
    "React & State Management",
    "Databases",
    "APIs",
    "DevOps & Deployment",
    "Authentication & Security",
  ],
  "Mobile Developer (iOS/Android)": [
    "Mobile Architecture",
    "UI & State Management",
    "Offline Storage",
    "Performance & Battery",
    "App Store Guidelines",
    "Push Notifications",
  ],
  "AI/ML Engineer": [
    "Machine Learning Fundamentals",
    "Model Deployment (MLOps)",
    "Data Pipelines",
    "Deep Learning",
    "LLMs & Prompt Engineering",
    "Model Evaluation",
  ],
  "Data Scientist": [
    "Statistics & Probability",
    "SQL & Data Wrangling",
    "Machine Learning Modeling",
    "A/B Testing",
    "Data Visualization",
    "Business Case Studies",
  ],
  "Product Manager": [
    "Product Strategy",
    "Prioritization Frameworks",
    "Metrics & Analytics",
    "Stakeholder Communication",
    "Go-to-Market Planning",
    "User Research",
  ],
  "UI/UX Designer": [
    "Design Systems",
    "User Research",
    "Wireframing & Prototyping",
    "Usability Testing",
    "Interaction Design",
    "Portfolio Review",
  ],
};

export const CUSTOM_TOPIC_VALUE = "__custom__";
