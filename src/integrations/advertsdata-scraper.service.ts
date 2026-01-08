import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JobsService } from '../jobs/jobs.service';
import * as puppeteer from 'puppeteer';
import * as cheerio from 'cheerio';

/**
 * advertsdata.com Scraper
 *
 * Scrapt Stellenanzeigen von B2B-Kunden
 * URL: https://db.advertsdata.com/anzeigendaten/index.cfm
 *
 * Funktionen:
 * - Login mit Credentials
 * - Stellenanzeigen scrapen
 * - Jobs in DB importieren
 * - Automatische Skill-Extraktion aus Stellenbeschreibungen
 */
@Injectable()
export class AdvertsDataScraperService {
  private readonly baseUrl: string;
  private readonly username: string;
  private readonly password: string;

  constructor(
    private configService: ConfigService,
    private jobsService: JobsService,
  ) {
    this.baseUrl =
      this.configService.get<string>('ADVERTSDATA_URL') ||
      'https://db.advertsdata.com/anzeigendaten/index.cfm';
    this.username = this.configService.get<string>('ADVERTSDATA_USERNAME') || '';
    this.password = this.configService.get<string>('ADVERTSDATA_PASSWORD') || '';
  }

  /**
   * Scrape Job-Listings
   */
  async scrapeJobs(limit: number = 50): Promise<any[]> {
    console.log('🕷️  Starte Scraping von advertsdata.com...');

    let browser: puppeteer.Browser | null = null;

    try {
      // Puppeteer starten
      browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
      });

      const page = await browser.newPage();

      // Login
      console.log('🔐 Login...');
      await this.login(page);

      // Job-Listings-Seite öffnen
      console.log('📄 Lade Job-Listings...');
      await page.goto(this.baseUrl, { waitUntil: 'networkidle2' });

      // Warten auf Job-Liste
      await page.waitForSelector('.job-listing, .anzeige, table', { timeout: 10000 });

      // HTML abrufen
      const html = await page.content();

      // Parsen mit Cheerio
      const $ = cheerio.load(html);
      const jobs = [];

      // Job-Einträge finden (muss an tatsächliche HTML-Struktur angepasst werden)
      $('.job-listing, .anzeige, tbody tr').each((i, element) => {
        if (i >= limit) return;

        const $el = $(element);

        // Daten extrahieren (Beispiel - muss angepasst werden)
        const job = {
          title: $el.find('.title, .job-title, td:nth-child(1)').text().trim(),
          company: $el.find('.company, .firma, td:nth-child(2)').text().trim(),
          location: $el.find('.location, .ort, td:nth-child(3)').text().trim(),
          description: $el.find('.description, .beschreibung').text().trim(),
          publishedAt: this.parseDate($el.find('.date, .datum, td:nth-child(4)').text().trim()),
        };

        if (job.title) {
          jobs.push(job);
        }
      });

      console.log(`✅ Gefunden: ${jobs.length} Stellenanzeigen`);

      // Jobs importieren
      const imported = [];
      for (const job of jobs) {
        try {
          const importedJob = await this.importJob(job);
          imported.push(importedJob);
          console.log(`✅ ${importedJob.title} @ ${importedJob.company}`);
        } catch (error) {
          console.error(`❌ Fehler beim Import:`, error.message);
        }
      }

      console.log(`\n✅ ${imported.length} Stellen importiert`);

      return imported;
    } catch (error) {
      console.error('Scraping Error:', error.message);
      throw error;
    } finally {
      if (browser) {
        await browser.close();
      }
    }
  }

  /**
   * Login
   */
  private async login(page: puppeteer.Page): Promise<void> {
    try {
      await page.goto(this.baseUrl);

      // Login-Formular ausfüllen (muss an tatsächliche Form angepasst werden)
      await page.type('input[name="username"], input[name="user"], #username', this.username);
      await page.type('input[name="password"], input[name="pass"], #password', this.password);

      // Submit
      await Promise.all([
        page.click('button[type="submit"], input[type="submit"], .login-button'),
        page.waitForNavigation({ waitUntil: 'networkidle2' }),
      ]);

      console.log('✅ Login erfolgreich');
    } catch (error) {
      console.error('Login Error:', error.message);
      throw error;
    }
  }

  /**
   * Job in DB importieren
   */
  private async importJob(scrapedJob: any): Promise<any> {
    // Skills aus Beschreibung extrahieren
    const skills = this.extractSkills(scrapedJob.description || scrapedJob.title);

    // Job erstellen
    const jobData = {
      source: 'ADVERTSDATA' as any,
      title: scrapedJob.title,
      company: scrapedJob.company,
      location: scrapedJob.location,
      description: scrapedJob.description,
      status: 'OPEN' as any,
      publishedAt: scrapedJob.publishedAt,
      scrapedAt: new Date(),
    };

    const job = await this.jobsService.create(jobData);

    // Skills hinzufügen
    for (const skill of skills) {
      await this.jobsService.addRequiredSkill(job.id, skill, true, 'MEDIUM');
    }

    return job;
  }

  /**
   * Skills aus Text extrahieren
   */
  private extractSkills(text: string): string[] {
    const lowerText = text.toLowerCase();

    const skillKeywords = [
      'java',
      'python',
      'javascript',
      'typescript',
      'react',
      'angular',
      'vue',
      'node.js',
      'nestjs',
      'spring',
      'spring boot',
      'django',
      'flask',
      'sql',
      'postgresql',
      'mysql',
      'mongodb',
      'redis',
      'docker',
      'kubernetes',
      'aws',
      'azure',
      'gcp',
      'cloud',
      'devops',
      'ci/cd',
      'jenkins',
      'gitlab',
      'rest',
      'graphql',
      'microservices',
      'agile',
      'scrum',
    ];

    const found = [];
    for (const skill of skillKeywords) {
      if (lowerText.includes(skill.toLowerCase())) {
        found.push(skill);
      }
    }

    return found;
  }

  /**
   * Datum parsen
   */
  private parseDate(dateStr: string): Date | undefined {
    if (!dateStr) return undefined;

    try {
      // Verschiedene Datumsformate unterstützen
      const date = new Date(dateStr);
      if (!isNaN(date.getTime())) {
        return date;
      }
    } catch (error) {
      // Ignore
    }

    return undefined;
  }

  /**
   * Scraping-Job als Cron ausführen
   * (z.B. täglich um 6 Uhr)
   */
  async scheduledScrape(): Promise<void> {
    console.log('⏰ Scheduled Scrape gestartet...');
    await this.scrapeJobs(100);
  }
}
