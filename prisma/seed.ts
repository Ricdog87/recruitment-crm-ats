import { PrismaClient, Role, WorkModel, Seniority, ProjectStatus } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Clear existing data in development
  await prisma.auditLog.deleteMany();
  await prisma.consentRecord.deleteMany();
  await prisma.document.deleteMany();
  await prisma.activity.deleteMany();
  await prisma.submission.deleteMany();
  await prisma.candidate.deleteMany();
  await prisma.project.deleteMany();
  await prisma.contact.deleteMany();
  await prisma.company.deleteMany();
  await prisma.teamMember.deleteMany();
  await prisma.team.deleteMany();
  await prisma.user.deleteMany();
  await prisma.plzGeodata.deleteMany();

  // Seed PLZ Geodata (German postal codes with coordinates)
  console.log('📍 Seeding PLZ geodata...');
  const plzData = [
    { plz: '10115', city: 'Berlin Mitte', latitude: 52.531677, longitude: 13.3888599 },
    { plz: '80331', city: 'München Altstadt', latitude: 48.1374, longitude: 11.5755 },
    { plz: '20095', city: 'Hamburg Altstadt', latitude: 53.5511, longitude: 9.9937 },
    { plz: '50667', city: 'Köln Altstadt', latitude: 50.9375, longitude: 6.9603 },
    { plz: '60311', city: 'Frankfurt Innenstadt', latitude: 50.1109, longitude: 8.6821 },
    { plz: '70173', city: 'Stuttgart Mitte', latitude: 48.7758, longitude: 9.1829 },
    { plz: '40213', city: 'Düsseldorf Altstadt', latitude: 51.2277, longitude: 6.7735 },
    { plz: '04109', city: 'Leipzig Zentrum', latitude: 51.3397, longitude: 12.3731 },
    { plz: '01067', city: 'Dresden Altstadt', latitude: 51.0504, longitude: 13.7373 },
    { plz: '30159', city: 'Hannover Mitte', latitude: 52.3759, longitude: 9.732 },
    { plz: '90402', city: 'Nürnberg Mitte', latitude: 49.4521, longitude: 11.0767 },
    { plz: '28195', city: 'Bremen Mitte', latitude: 53.0793, longitude: 8.8017 },
    { plz: '76131', city: 'Karlsruhe Innenstadt-West', latitude: 49.0069, longitude: 8.4037 },
    { plz: '68159', city: 'Mannheim Innenstadt', latitude: 49.4875, longitude: 8.4661 },
    { plz: '45127', city: 'Essen Stadtkern', latitude: 51.4556, longitude: 7.0116 },
    { plz: '44135', city: 'Dortmund Mitte', latitude: 51.5136, longitude: 7.4653 },
    { plz: '34117', city: 'Kassel Mitte', latitude: 51.3127, longitude: 9.4797 },
    { plz: '99084', city: 'Erfurt Altstadt', latitude: 50.9787, longitude: 11.0328 },
    { plz: '65183', city: 'Wiesbaden Mitte', latitude: 50.0826, longitude: 8.24 },
    { plz: '66111', city: 'Saarbrücken Mitte', latitude: 49.2354, longitude: 6.9969 },
  ];

  for (const data of plzData) {
    await prisma.plzGeodata.create({ data });
  }
  console.log(`✅ Created ${plzData.length} PLZ geodata entries`);

  // Create Users
  console.log('👥 Creating users...');
  const passwordHash = await bcrypt.hash('password123', 10);

  const admin = await prisma.user.create({
    data: {
      email: 'admin@example.com',
      password_hash: passwordHash,
      first_name: 'Admin',
      last_name: 'User',
    },
  });

  const manager = await prisma.user.create({
    data: {
      email: 'manager@example.com',
      password_hash: passwordHash,
      first_name: 'Manager',
      last_name: 'Schmidt',
    },
  });

  const recruiter1 = await prisma.user.create({
    data: {
      email: 'recruiter1@example.com',
      password_hash: passwordHash,
      first_name: 'Anna',
      last_name: 'Müller',
    },
  });

  const recruiter2 = await prisma.user.create({
    data: {
      email: 'recruiter2@example.com',
      password_hash: passwordHash,
      first_name: 'Thomas',
      last_name: 'Weber',
    },
  });

  const viewer = await prisma.user.create({
    data: {
      email: 'viewer@example.com',
      password_hash: passwordHash,
      first_name: 'Viewer',
      last_name: 'Only',
    },
  });

  console.log('✅ Created 5 users');

  // Create Teams
  console.log('🏢 Creating teams...');
  const team1 = await prisma.team.create({
    data: {
      name: 'Tech Recruiting Team',
    },
  });

  const team2 = await prisma.team.create({
    data: {
      name: 'Executive Search Team',
    },
  });

  console.log('✅ Created 2 teams');

  // Create Team Members
  console.log('👤 Creating team memberships...');
  await prisma.teamMember.createMany({
    data: [
      { team_id: team1.id, user_id: admin.id, role: Role.ADMIN },
      { team_id: team1.id, user_id: manager.id, role: Role.MANAGER },
      { team_id: team1.id, user_id: recruiter1.id, role: Role.RECRUITER },
      { team_id: team1.id, user_id: viewer.id, role: Role.VIEWER },
      { team_id: team2.id, user_id: admin.id, role: Role.ADMIN },
      { team_id: team2.id, user_id: recruiter2.id, role: Role.RECRUITER },
    ],
  });
  console.log('✅ Created team memberships');

  // Create Companies
  console.log('🏭 Creating companies...');
  const company1 = await prisma.company.create({
    data: {
      team_id: team1.id,
      name: 'TechCorp GmbH',
      website: 'https://techcorp.example.com',
      industry: 'Software Development',
      description: 'Leading software development company',
    },
  });

  const company2 = await prisma.company.create({
    data: {
      team_id: team1.id,
      name: 'FinTech Solutions AG',
      website: 'https://fintech.example.com',
      industry: 'Financial Technology',
      description: 'Innovative fintech startup',
    },
  });

  const company3 = await prisma.company.create({
    data: {
      team_id: team1.id,
      name: 'AutoMotive Systems',
      website: 'https://automotive.example.com',
      industry: 'Automotive',
      description: 'Automotive software and embedded systems',
    },
  });

  console.log('✅ Created 3 companies');

  // Create Contacts
  console.log('📞 Creating contacts...');
  await prisma.contact.createMany({
    data: [
      {
        team_id: team1.id,
        company_id: company1.id,
        first_name: 'Julia',
        last_name: 'Hoffmann',
        email: 'j.hoffmann@techcorp.example.com',
        phone: '+49 30 12345678',
        position: 'Head of Engineering',
      },
      {
        team_id: team1.id,
        company_id: company2.id,
        first_name: 'Michael',
        last_name: 'Bauer',
        email: 'm.bauer@fintech.example.com',
        phone: '+49 89 87654321',
        position: 'CTO',
      },
      {
        team_id: team1.id,
        company_id: company3.id,
        first_name: 'Sarah',
        last_name: 'Fischer',
        email: 's.fischer@automotive.example.com',
        phone: '+49 711 55555555',
        position: 'HR Manager',
      },
    ],
  });
  console.log('✅ Created 3 contacts');

  // Create Projects
  console.log('📋 Creating projects...');
  const project1 = await prisma.project.create({
    data: {
      team_id: team1.id,
      title: 'Senior Backend Engineer (Node.js)',
      status: ProjectStatus.ACTIVE,
      company_name: 'TechCorp GmbH',
      plz: '10115',
      radius_km: 30,
      work_model: WorkModel.HYBRID,
      salary_min: 70000,
      salary_max: 95000,
      must_have_skills: ['Node.js', 'TypeScript', 'PostgreSQL', 'REST API'],
      nice_to_have_skills: ['NestJS', 'Docker', 'AWS', 'Microservices'],
      required_languages: ['Deutsch', 'Englisch'],
      required_seniority: Seniority.SENIOR,
      description: 'We are looking for a Senior Backend Engineer with strong Node.js experience.',
    },
  });

  const project2 = await prisma.project.create({
    data: {
      team_id: team1.id,
      title: 'Frontend Developer (React)',
      status: ProjectStatus.ACTIVE,
      company_name: 'FinTech Solutions AG',
      plz: '80331',
      radius_km: 50,
      work_model: WorkModel.REMOTE,
      salary_min: 55000,
      salary_max: 75000,
      must_have_skills: ['React', 'TypeScript', 'CSS'],
      nice_to_have_skills: ['Next.js', 'TailwindCSS', 'GraphQL'],
      required_languages: ['Englisch'],
      required_seniority: Seniority.MID,
      description: 'Join our fintech team as a Frontend Developer.',
    },
  });

  const project3 = await prisma.project.create({
    data: {
      team_id: team1.id,
      title: 'DevOps Engineer',
      status: ProjectStatus.ACTIVE,
      company_name: 'AutoMotive Systems',
      plz: '70173',
      radius_km: 20,
      work_model: WorkModel.ONSITE,
      salary_min: 65000,
      salary_max: 85000,
      must_have_skills: ['Kubernetes', 'Docker', 'CI/CD', 'Linux'],
      nice_to_have_skills: ['Terraform', 'Ansible', 'Prometheus', 'Grafana'],
      required_languages: ['Deutsch', 'Englisch'],
      description: 'DevOps Engineer for automotive embedded systems infrastructure.',
    },
  });

  console.log('✅ Created 3 projects');

  // Create Candidates
  console.log('👨‍💼 Creating candidates...');
  const candidate1 = await prisma.candidate.create({
    data: {
      team_id: team1.id,
      first_name: 'Max',
      last_name: 'Mustermann',
      email: 'max.mustermann@example.com',
      phone: '+49 170 1234567',
      plz: '10115',
      skills: ['Node.js', 'TypeScript', 'PostgreSQL', 'REST API', 'Docker', 'NestJS'],
      seniority: Seniority.SENIOR,
      languages: ['Deutsch', 'Englisch'],
      salary_expectation: 85000,
      availability_date: new Date('2024-03-01'),
      notes: 'Very experienced backend developer with 8 years of experience.',
    },
  });

  const candidate2 = await prisma.candidate.create({
    data: {
      team_id: team1.id,
      first_name: 'Lisa',
      last_name: 'Meyer',
      email: 'lisa.meyer@example.com',
      phone: '+49 170 2345678',
      plz: '80331',
      skills: ['React', 'TypeScript', 'CSS', 'Next.js', 'TailwindCSS', 'JavaScript'],
      seniority: Seniority.MID,
      languages: ['Deutsch', 'Englisch'],
      salary_expectation: 65000,
      availability_date: new Date('2024-02-15'),
      notes: 'Talented frontend developer with design background.',
    },
  });

  const candidate3 = await prisma.candidate.create({
    data: {
      team_id: team1.id,
      first_name: 'Tom',
      last_name: 'Schneider',
      email: 'tom.schneider@example.com',
      phone: '+49 170 3456789',
      plz: '70173',
      skills: ['Kubernetes', 'Docker', 'CI/CD', 'Linux', 'Terraform', 'AWS'],
      seniority: Seniority.SENIOR,
      languages: ['Deutsch', 'Englisch'],
      salary_expectation: 78000,
      availability_date: new Date('2024-04-01'),
      notes: 'DevOps expert with cloud infrastructure experience.',
    },
  });

  const candidate4 = await prisma.candidate.create({
    data: {
      team_id: team1.id,
      first_name: 'Emma',
      last_name: 'Wagner',
      email: 'emma.wagner@example.com',
      phone: '+49 170 4567890',
      plz: '20095',
      skills: ['Node.js', 'Python', 'PostgreSQL', 'MongoDB', 'REST API'],
      seniority: Seniority.MID,
      languages: ['Deutsch', 'Englisch', 'Französisch'],
      salary_expectation: 62000,
      availability_date: new Date('2024-05-01'),
      notes: 'Polyglot developer with strong database skills.',
    },
  });

  const candidate5 = await prisma.candidate.create({
    data: {
      team_id: team1.id,
      first_name: 'Felix',
      last_name: 'Becker',
      email: 'felix.becker@example.com',
      phone: '+49 170 5678901',
      plz: '50667',
      skills: ['React', 'Vue.js', 'JavaScript', 'CSS', 'HTML'],
      seniority: Seniority.JUNIOR,
      languages: ['Deutsch', 'Englisch'],
      salary_expectation: 48000,
      availability_date: new Date('2024-03-15'),
      notes: 'Junior developer eager to learn and grow.',
    },
  });

  console.log('✅ Created 5 candidates');

  // Create Submissions
  console.log('📤 Creating submissions...');
  await prisma.submission.createMany({
    data: [
      {
        team_id: team1.id,
        candidate_id: candidate1.id,
        project_id: project1.id,
        status: 'SUBMITTED',
        notes: 'Perfect match for the role',
        submitted_at: new Date(),
      },
      {
        team_id: team1.id,
        candidate_id: candidate2.id,
        project_id: project2.id,
        status: 'INTERVIEW',
        notes: 'Great portfolio, scheduled for interview',
        submitted_at: new Date(),
      },
      {
        team_id: team1.id,
        candidate_id: candidate3.id,
        project_id: project3.id,
        status: 'QUALIFIED',
        notes: 'Strong DevOps background',
      },
    ],
  });
  console.log('✅ Created 3 submissions');

  // Create Activities
  console.log('📝 Creating activities...');
  await prisma.activity.createMany({
    data: [
      {
        team_id: team1.id,
        user_id: recruiter1.id,
        type: 'CALL',
        subject: 'Initial screening call with Max Mustermann',
        body: 'Had a great call. Candidate is interested and available from March 1st.',
        candidate_id: candidate1.id,
      },
      {
        team_id: team1.id,
        user_id: recruiter1.id,
        type: 'EMAIL',
        subject: 'Sent project details to Lisa Meyer',
        body: 'Sent detailed job description and company information.',
        candidate_id: candidate2.id,
        project_id: project2.id,
      },
      {
        team_id: team1.id,
        user_id: manager.id,
        type: 'MEETING',
        subject: 'Client meeting with TechCorp',
        body: 'Discussed project requirements and timeline.',
        project_id: project1.id,
      },
    ],
  });
  console.log('✅ Created 3 activities');

  // Create Consent Records
  console.log('📜 Creating consent records...');
  await prisma.consentRecord.createMany({
    data: [
      {
        candidate_id: candidate1.id,
        consent_type: 'DATA_PROCESSING',
        granted_at: new Date('2024-01-15'),
        source: 'web',
      },
      {
        candidate_id: candidate2.id,
        consent_type: 'DATA_PROCESSING',
        granted_at: new Date('2024-01-20'),
        source: 'email',
      },
      {
        candidate_id: candidate3.id,
        consent_type: 'DATA_PROCESSING',
        granted_at: new Date('2024-01-18'),
        source: 'phone',
      },
    ],
  });
  console.log('✅ Created 3 consent records');

  console.log('');
  console.log('🎉 Seeding completed successfully!');
  console.log('');
  console.log('📧 Test users:');
  console.log('   Admin:      admin@example.com / password123');
  console.log('   Manager:    manager@example.com / password123');
  console.log('   Recruiter1: recruiter1@example.com / password123');
  console.log('   Recruiter2: recruiter2@example.com / password123');
  console.log('   Viewer:     viewer@example.com / password123');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
