import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ParsingStatus, Seniority } from '@prisma/client';

interface CVParsingResult {
  name?: string;
  email?: string;
  phone?: string;
  location?: string;
  skills: string[];
  languages: string[];
  seniority?: Seniority;
  experience: Array<{
    position: string;
    company: string;
    startDate?: string;
    endDate?: string;
    description?: string;
  }>;
}

@Injectable()
export class CVParsingService {
  private readonly logger = new Logger(CVParsingService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Parse CV text using OpenAI GPT-4 API
   */
  async parseCV(cvText: string): Promise<CVParsingResult> {
    const openaiApiKey = process.env.OPENAI_API_KEY;

    if (!openaiApiKey) {
      this.logger.warn('OPENAI_API_KEY not configured, falling back to keyword extraction');
      return this.fallbackKeywordExtraction(cvText);
    }

    try {
      const prompt = this.buildPrompt(cvText);

      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${openaiApiKey}`,
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [
            {
              role: 'system',
              content: 'You are an expert HR assistant specialized in parsing CVs and extracting structured data. Always respond with valid JSON.',
            },
            {
              role: 'user',
              content: prompt,
            },
          ],
          temperature: 0.1,
          max_tokens: 2000,
        }),
      });

      if (!response.ok) {
        throw new Error(`OpenAI API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      const content = data.choices[0]?.message?.content;

      if (!content) {
        throw new Error('Empty response from OpenAI');
      }

      // Parse JSON from response (handle markdown code blocks)
      const jsonMatch = content.match(/```json\n?([\s\S]*?)\n?```/) || content.match(/\{[\s\S]*\}/);
      const jsonStr = jsonMatch ? (jsonMatch[1] || jsonMatch[0]) : content;

      const parsed = JSON.parse(jsonStr);

      return this.normalizeParsingResult(parsed);
    } catch (error) {
      this.logger.error(`CV parsing failed: ${error.message}`, error.stack);
      return this.fallbackKeywordExtraction(cvText);
    }
  }

  /**
   * Build the OpenAI prompt for CV parsing
   */
  private buildPrompt(cvText: string): string {
    return `Analyze the following CV/Resume and extract structured information. Return ONLY a JSON object with this exact structure:

{
  "name": "Full name of the candidate",
  "email": "Email address (if found)",
  "phone": "Phone number (if found)",
  "location": "City and/or PLZ (if found)",
  "skills": ["Skill1", "Skill2", "..."],
  "languages": ["German", "English", "..."],
  "seniority": "JUNIOR|MID|SENIOR|LEAD (estimate based on years of experience)",
  "experience": [
    {
      "position": "Job title",
      "company": "Company name",
      "startDate": "YYYY-MM (if available)",
      "endDate": "YYYY-MM or 'Present' (if available)",
      "description": "Brief description of responsibilities"
    }
  ]
}

Guidelines:
- Extract ALL technical skills (programming languages, frameworks, tools, methodologies)
- For languages, include only spoken languages (Deutsch, Englisch, etc.)
- Estimate seniority: <2 years = JUNIOR, 2-5 years = MID, 5-10 years = SENIOR, 10+ years or leadership = LEAD
- Include ALL work experience entries
- If information is missing, use null or empty array []
- Ensure valid JSON format

CV Text:
---
${cvText.substring(0, 10000)}
---`;
  }

  /**
   * Normalize and validate the parsing result
   */
  private normalizeParsingResult(raw: any): CVParsingResult {
    return {
      name: raw.name || undefined,
      email: raw.email || undefined,
      phone: raw.phone || undefined,
      location: raw.location || undefined,
      skills: Array.isArray(raw.skills) ? raw.skills.filter((s: any) => typeof s === 'string') : [],
      languages: Array.isArray(raw.languages) ? raw.languages.filter((l: any) => typeof l === 'string') : [],
      seniority: this.normalizeSeniority(raw.seniority),
      experience: Array.isArray(raw.experience) ? raw.experience.map((exp: any) => ({
        position: exp.position || 'Unknown Position',
        company: exp.company || 'Unknown Company',
        startDate: exp.startDate || undefined,
        endDate: exp.endDate || undefined,
        description: exp.description || undefined,
      })) : [],
    };
  }

  /**
   * Normalize seniority string to enum value
   */
  private normalizeSeniority(value: any): Seniority | undefined {
    if (!value) return undefined;

    const upper = String(value).toUpperCase();
    if (upper in Seniority) {
      return upper as Seniority;
    }

    return undefined;
  }

  /**
   * Fallback keyword-based extraction (when OpenAI is not available)
   */
  private fallbackKeywordExtraction(cvText: string): CVParsingResult {
    const text = cvText.toLowerCase();
    const skills: string[] = [];
    const languages: string[] = [];

    // Technical skills keywords
    const skillKeywords = [
      'javascript', 'typescript', 'python', 'java', 'c#', 'c++', 'go', 'rust', 'php', 'ruby',
      'node.js', 'react', 'vue', 'angular', 'svelte', 'next.js', 'nestjs', 'express', 'fastify',
      'docker', 'kubernetes', 'aws', 'azure', 'gcp', 'terraform', 'ansible',
      'postgresql', 'mysql', 'mongodb', 'redis', 'elasticsearch',
      'graphql', 'rest api', 'grpc', 'microservices', 'ci/cd', 'git', 'jenkins', 'gitlab',
      'agile', 'scrum', 'tdd', 'ddd', 'solid', 'clean code',
    ];

    skillKeywords.forEach((skill) => {
      if (text.includes(skill)) {
        skills.push(skill.charAt(0).toUpperCase() + skill.slice(1));
      }
    });

    // Language keywords
    const languageKeywords = [
      'deutsch', 'german', 'englisch', 'english',
      'französisch', 'french', 'spanisch', 'spanish',
      'italienisch', 'italian', 'polnisch', 'polish',
    ];

    languageKeywords.forEach((lang) => {
      if (text.includes(lang)) {
        const normalized = lang.charAt(0).toUpperCase() + lang.slice(1);
        if (!languages.includes(normalized)) {
          languages.push(normalized);
        }
      }
    });

    // Estimate seniority based on keywords
    let seniority: Seniority | undefined;
    if (text.includes('senior') || text.includes('lead') || text.includes('principal') || text.includes('staff')) {
      seniority = Seniority.SENIOR;
    } else if (text.includes('junior') || text.includes('entry level') || text.includes('graduate')) {
      seniority = Seniority.JUNIOR;
    } else if (text.includes('mid') || text.includes('intermediate')) {
      seniority = Seniority.MID;
    }

    return {
      skills: [...new Set(skills)], // Remove duplicates
      languages: [...new Set(languages)],
      seniority,
      experience: [],
    };
  }

  /**
   * Parse CV for a specific candidate and update the database
   */
  async parseCVForCandidate(candidateId: string, cvText: string, teamId: string): Promise<void> {
    try {
      // Update status to IN_PROGRESS
      await this.prisma.candidate.update({
        where: { id: candidateId },
        data: { cv_parsing_status: ParsingStatus.IN_PROGRESS },
      });

      // Parse CV
      const result = await this.parseCV(cvText);

      // Get current candidate data
      const candidate = await this.prisma.candidate.findUnique({
        where: { id: candidateId },
      });

      if (!candidate || candidate.team_id !== teamId) {
        throw new Error('Candidate not found or access denied');
      }

      // Merge skills and languages (keep existing + add new)
      const mergedSkills = [...new Set([...candidate.skills, ...result.skills])];
      const mergedLanguages = [...new Set([...candidate.languages, ...result.languages])];

      // Update candidate with parsed data
      await this.prisma.candidate.update({
        where: { id: candidateId },
        data: {
          skills: mergedSkills,
          languages: mergedLanguages,
          seniority: result.seniority || candidate.seniority,
          // Optionally update other fields if they're empty
          first_name: candidate.first_name || result.name?.split(' ')[0] || candidate.first_name,
          last_name: candidate.last_name || result.name?.split(' ').slice(1).join(' ') || candidate.last_name,
          email: candidate.email || result.email || candidate.email,
          phone: candidate.phone || result.phone,
          cv_parsing_status: ParsingStatus.COMPLETED,
        },
      });

      this.logger.log(`Successfully parsed CV for candidate ${candidateId}`);
    } catch (error) {
      this.logger.error(`Failed to parse CV for candidate ${candidateId}: ${error.message}`);

      // Update status to FAILED
      await this.prisma.candidate.update({
        where: { id: candidateId },
        data: { cv_parsing_status: ParsingStatus.FAILED },
      });

      throw error;
    }
  }
}
