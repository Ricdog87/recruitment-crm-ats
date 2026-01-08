import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CandidatesService } from '../candidates/candidates.service';
import { JobsService } from '../jobs/jobs.service';
import { MatchingService } from '../matching/matching.service';
import { ChangeReadinessService } from '../change-readiness/change-readiness.service';
import OpenAI from 'openai';

/**
 * CLI Service für natürliche Sprachbefehle
 *
 * Verwendet OpenAI GPT für Natural Language Understanding (NLU)
 * um Benutzer-Intents zu erkennen und entsprechende Aktionen auszuführen
 */
@Injectable()
export class CliService {
  private openai: OpenAI | null = null;

  constructor(
    private configService: ConfigService,
    private candidatesService: CandidatesService,
    private jobsService: JobsService,
    private matchingService: MatchingService,
    private changeReadinessService: ChangeReadinessService,
  ) {
    const apiKey = this.configService.get<string>('OPENAI_API_KEY');
    if (apiKey) {
      this.openai = new OpenAI({ apiKey });
    }
  }

  /**
   * Natural Language Command Processing
   */
  async processCommand(command: string): Promise<void> {
    console.log(`\n⏳ Verarbeite: "${command}"\n`);

    try {
      // Intent-Erkennung mit OpenAI
      const intent = await this.detectIntent(command);

      console.log(`🎯 Intent erkannt: ${intent.action}\n`);

      // Aktion ausführen
      switch (intent.action) {
        case 'find_candidates_for_job':
          await this.findCandidatesForJobByIntent(intent);
          break;

        case 'find_jobs_for_candidate':
          await this.findJobsForCandidateByIntent(intent);
          break;

        case 'show_change_ready_candidates':
          await this.showTopChangeReady({ limit: intent.limit || 20 });
          break;

        case 'show_open_to_work':
          await this.showOpenToWork();
          break;

        case 'search_candidates_by_skills':
          await this.searchCandidatesBySkills(intent.skills);
          break;

        case 'search_jobs_by_skills':
          await this.searchJobsBySkills(intent.skills);
          break;

        default:
          console.log('❓ Befehl nicht verstanden. Versuchen Sie "help" für Hilfe.\n');
      }
    } catch (error) {
      console.error('❌ Fehler beim Verarbeiten des Befehls:', error.message);
    }
  }

  /**
   * Intent-Erkennung mit OpenAI
   */
  private async detectIntent(command: string): Promise<any> {
    if (!this.openai) {
      // Fallback: Einfache Keyword-Erkennung
      return this.detectIntentFallback(command);
    }

    const response = await this.openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        {
          role: 'system',
          content: `Du bist ein Intent-Erkennungs-System für ein Recruiting-Tool.
Erkenne die Absicht des Benutzers und gib ein JSON-Objekt zurück mit:
{
  "action": "find_candidates_for_job" | "find_jobs_for_candidate" | "show_change_ready_candidates" | "show_open_to_work" | "search_candidates_by_skills" | "search_jobs_by_skills",
  "skills": ["skill1", "skill2"],
  "limit": 20,
  "minScore": 70,
  "jobId": "optional",
  "candidateId": "optional"
}`,
        },
        {
          role: 'user',
          content: command,
        },
      ],
      response_format: { type: 'json_object' },
    });

    const result = JSON.parse(response.choices[0].message.content || '{}');
    return result;
  }

  /**
   * Fallback Intent-Erkennung (ohne OpenAI)
   */
  private detectIntentFallback(command: string): any {
    const lowerCommand = command.toLowerCase();

    // Wechselbereitschaft
    if (
      lowerCommand.includes('wechselbereit') ||
      lowerCommand.includes('change ready') ||
      lowerCommand.includes('wechselwillig')
    ) {
      return { action: 'show_change_ready_candidates', limit: 20 };
    }

    if (lowerCommand.includes('open to work')) {
      return { action: 'show_open_to_work' };
    }

    // Kandidaten für Stelle
    if (
      lowerCommand.includes('kandidaten für') ||
      lowerCommand.includes('finde kandidaten') ||
      lowerCommand.includes('suche kandidaten')
    ) {
      const skills = this.extractSkills(command);
      return { action: 'find_candidates_for_job', skills };
    }

    // Stellen für Kandidat
    if (
      lowerCommand.includes('stellen für') ||
      lowerCommand.includes('finde stellen') ||
      lowerCommand.includes('jobs für')
    ) {
      const skills = this.extractSkills(command);
      return { action: 'find_jobs_for_candidate', skills };
    }

    // Skills-Suche
    const skills = this.extractSkills(command);
    if (skills.length > 0) {
      return { action: 'search_candidates_by_skills', skills };
    }

    return { action: 'unknown' };
  }

  /**
   * Skills aus Text extrahieren
   */
  private extractSkills(text: string): string[] {
    const commonSkills = [
      'java',
      'python',
      'javascript',
      'typescript',
      'react',
      'angular',
      'vue',
      'node',
      'nestjs',
      'spring',
      'django',
      'sql',
      'postgresql',
      'mongodb',
      'docker',
      'kubernetes',
      'aws',
      'azure',
      'gcp',
    ];

    const lowerText = text.toLowerCase();
    const foundSkills = commonSkills.filter((skill) => lowerText.includes(skill));

    return foundSkills;
  }

  /**
   * Finde Kandidaten für Job (by Intent)
   */
  private async findCandidatesForJobByIntent(intent: any): Promise<void> {
    console.log('🔍 Suche Kandidaten...\n');

    // Wenn Job ID gegeben
    if (intent.jobId) {
      const matches = await this.matchingService.findCandidatesForJob(
        intent.jobId,
        intent.minScore || 60,
      );
      this.displayMatches(matches, 'candidates');
      return;
    }

    // Wenn Skills gegeben
    if (intent.skills && intent.skills.length > 0) {
      const candidates = await this.candidatesService.findBySkills(intent.skills);
      const changeReadyCandidates = candidates.filter(
        (c) => c.changeReadiness && c.changeReadiness.overallScore >= 70,
      );
      this.displayCandidates(changeReadyCandidates);
      return;
    }

    console.log('❌ Bitte geben Sie eine Job ID oder Skills an.\n');
  }

  /**
   * Finde Jobs für Kandidat (by Intent)
   */
  private async findJobsForCandidateByIntent(intent: any): Promise<void> {
    console.log('🔍 Suche passende Stellen...\n');

    if (intent.candidateId) {
      const matches = await this.matchingService.findJobsForCandidate(
        intent.candidateId,
        intent.minScore || 60,
      );
      this.displayMatches(matches, 'jobs');
      return;
    }

    if (intent.skills && intent.skills.length > 0) {
      const jobs = await this.jobsService.findBySkills(intent.skills);
      this.displayJobs(jobs);
      return;
    }

    console.log('❌ Bitte geben Sie eine Kandidaten ID oder Skills an.\n');
  }

  /**
   * Zeige wechselbereite Kandidaten
   */
  async showTopChangeReady(options: any): Promise<void> {
    const limit = parseInt(options.limit) || 20;

    console.log(`🎯 Top ${limit} wechselbereite Kandidaten:\n`);

    const candidates = await this.changeReadinessService.getTopChangeReady(limit);

    if (candidates.length === 0) {
      console.log('Keine wechselbereiten Kandidaten gefunden.\n');
      return;
    }

    this.displayCandidates(candidates);
  }

  /**
   * Zeige "Open to Work" Kandidaten
   */
  async showOpenToWork(): Promise<void> {
    console.log('🚀 Kandidaten mit "Open to Work" Signal:\n');

    const candidates = await this.candidatesService.findOpenToWork();

    if (candidates.length === 0) {
      console.log('Keine "Open to Work" Kandidaten gefunden.\n');
      return;
    }

    this.displayCandidates(candidates);
  }

  /**
   * Kandidaten nach Skills suchen
   */
  async searchCandidatesBySkills(skills: string[]): Promise<void> {
    console.log(`🔍 Suche Kandidaten mit Skills: ${skills.join(', ')}\n`);

    const candidates = await this.candidatesService.findBySkills(skills);
    this.displayCandidates(candidates);
  }

  /**
   * Jobs nach Skills suchen
   */
  async searchJobsBySkills(skills: string[]): Promise<void> {
    console.log(`🔍 Suche Jobs mit Skills: ${skills.join(', ')}\n`);

    const jobs = await this.jobsService.findBySkills(skills);
    this.displayJobs(jobs);
  }

  /**
   * CLI Commands
   */
  async findCandidatesForJob(options: any): Promise<void> {
    if (!options.jobId) {
      console.error('❌ Job ID ist erforderlich. Verwenden Sie --job-id <id>');
      return;
    }

    const matches = await this.matchingService.findCandidatesForJob(
      options.jobId,
      parseInt(options.minScore) || 70,
    );

    this.displayMatches(matches, 'candidates');
  }

  async findJobsForCandidate(options: any): Promise<void> {
    if (!options.candidateId) {
      console.error('❌ Kandidaten ID ist erforderlich. Verwenden Sie --candidate-id <id>');
      return;
    }

    const matches = await this.matchingService.findJobsForCandidate(
      options.candidateId,
      parseInt(options.minScore) || 70,
    );

    this.displayMatches(matches, 'jobs');
  }

  async scrapeAdvertsData(options: any): Promise<void> {
    console.log('🕷️  Scraping advertsdata.com...\n');
    console.log('⚠️  Scraper wird in Kürze implementiert.\n');
  }

  /**
   * Display Helpers
   */
  private displayCandidates(candidates: any[]): void {
    console.log(`Gefunden: ${candidates.length} Kandidaten\n`);
    console.log('─'.repeat(80));

    for (const candidate of candidates.slice(0, 10)) {
      const skills = candidate.skills?.map((cs: any) => cs.skill.name).join(', ') || 'N/A';
      const changeScore = candidate.changeReadiness?.overallScore || 0;

      console.log(`
👤 ${candidate.firstName} ${candidate.lastName}
   📧 ${candidate.email || 'N/A'}
   💼 ${candidate.title || 'N/A'}
   🎯 Skills: ${skills}
   🔄 Wechselwilligkeit: ${changeScore}% ${this.getScoreEmoji(changeScore)}
   📍 ${candidate.location || 'N/A'}
      `);
      console.log('─'.repeat(80));
    }

    if (candidates.length > 10) {
      console.log(`... und ${candidates.length - 10} weitere\n`);
    }
  }

  private displayJobs(jobs: any[]): void {
    console.log(`Gefunden: ${jobs.length} Stellen\n`);
    console.log('─'.repeat(80));

    for (const job of jobs.slice(0, 10)) {
      const skills =
        job.requiredSkills?.map((js: any) => js.skill.name).join(', ') || 'N/A';

      console.log(`
💼 ${job.title}
   🏢 ${job.company}
   📍 ${job.location || 'N/A'}
   🎯 Skills: ${skills}
   💰 ${job.salaryMin || '?'}€ - ${job.salaryMax || '?'}€
      `);
      console.log('─'.repeat(80));
    }

    if (jobs.length > 10) {
      console.log(`... und ${jobs.length - 10} weitere\n`);
    }
  }

  private displayMatches(matches: any[], type: 'candidates' | 'jobs'): void {
    console.log(`Gefunden: ${matches.length} Matches\n`);
    console.log('─'.repeat(80));

    for (const match of matches.slice(0, 10)) {
      if (type === 'candidates') {
        const candidate = match.candidate;
        console.log(`
👤 ${candidate.firstName} ${candidate.lastName}
   📊 Overall Score: ${match.overallScore}% ${this.getScoreEmoji(match.overallScore)}
   🎯 Skills Match: ${match.skillsScore}%
   🔄 Wechselwilligkeit: ${match.changeReadinessScore}%
   ✅ Matching Skills: ${match.matchingSkills?.join(', ') || 'N/A'}
   ❌ Missing Skills: ${match.missingSkills?.join(', ') || 'N/A'}
        `);
      } else {
        const job = match.job;
        console.log(`
💼 ${job.title} @ ${job.company}
   📊 Overall Score: ${match.overallScore}% ${this.getScoreEmoji(match.overallScore)}
   🎯 Skills Match: ${match.skillsScore}%
   📍 Location Match: ${match.locationScore}%
   💰 Salary Match: ${match.salaryScore}%
   ✅ Matching Skills: ${match.matchingSkills?.join(', ') || 'N/A'}
   ❌ Missing Skills: ${match.missingSkills?.join(', ') || 'N/A'}
        `);
      }
      console.log('─'.repeat(80));
    }

    if (matches.length > 10) {
      console.log(`... und ${matches.length - 10} weitere\n`);
    }
  }

  private getScoreEmoji(score: number): string {
    if (score >= 90) return '🔥';
    if (score >= 80) return '⭐';
    if (score >= 70) return '✅';
    if (score >= 60) return '👍';
    return '⚠️';
  }
}
