#!/usr/bin/env node

import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { Command } from 'commander';
import * as readline from 'readline';
import { CliService } from './cli.service';

const program = new Command();

program
  .name('recruitment-cli')
  .description('AI-Powered Recruitment CLI - Natürliche Befehle für Kandidaten & Stellen')
  .version('1.0.0');

// Interactive Mode
program
  .command('interactive')
  .alias('i')
  .description('Interaktiver Modus mit natürlichen Befehlen')
  .action(async () => {
    console.log(`
╔═══════════════════════════════════════════════════════════════╗
║                                                               ║
║   🤖 Recruitment CRM/ATS - Interactive Mode                  ║
║                                                               ║
║   Geben Sie natürliche Befehle ein:                          ║
║   ────────────────────────────────────────────────────────   ║
║   • "Suche Kandidaten für Java Developer Stelle"             ║
║   • "Finde Stellen für Kandidat mit Python Skills"           ║
║   • "Zeige mir wechselbereite Kandidaten"                    ║
║   • "Welche Kandidaten sind Open to Work?"                   ║
║                                                               ║
║   Befehle: 'exit' zum Beenden, 'help' für Hilfe             ║
║                                                               ║
╚═══════════════════════════════════════════════════════════════╝
    `);

    // Bootstrap NestJS app
    const app = await NestFactory.createApplicationContext(AppModule);
    const cliService = app.get(CliService);

    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
      prompt: '\n🚀 > ',
    });

    rl.prompt();

    rl.on('line', async (input: string) => {
      const command = input.trim();

      if (!command) {
        rl.prompt();
        return;
      }

      if (command === 'exit' || command === 'quit') {
        console.log('\n👋 Auf Wiedersehen!\n');
        process.exit(0);
      }

      if (command === 'help') {
        showHelp();
        rl.prompt();
        return;
      }

      try {
        // Process natural language command
        await cliService.processCommand(command);
      } catch (error) {
        console.error('❌ Fehler:', error.message);
      }

      rl.prompt();
    });

    rl.on('close', () => {
      console.log('\n👋 Auf Wiedersehen!\n');
      process.exit(0);
    });
  });

// Quick Commands
program
  .command('find-candidates')
  .description('Finde Kandidaten für eine Stelle')
  .option('-j, --job-id <id>', 'Job ID')
  .option('-s, --skills <skills>', 'Skills (komma-separiert)')
  .option('--min-score <score>', 'Minimum Match Score', '70')
  .action(async (options) => {
    const app = await NestFactory.createApplicationContext(AppModule);
    const cliService = app.get(CliService);
    await cliService.findCandidatesForJob(options);
    await app.close();
  });

program
  .command('find-jobs')
  .description('Finde Stellen für einen Kandidaten')
  .option('-c, --candidate-id <id>', 'Kandidaten ID')
  .option('-s, --skills <skills>', 'Skills (komma-separiert)')
  .option('--min-score <score>', 'Minimum Match Score', '70')
  .action(async (options) => {
    const app = await NestFactory.createApplicationContext(AppModule);
    const cliService = app.get(CliService);
    await cliService.findJobsForCandidate(options);
    await app.close();
  });

program
  .command('top-change-ready')
  .description('Zeige top wechselbereite Kandidaten')
  .option('-l, --limit <limit>', 'Anzahl Kandidaten', '20')
  .action(async (options) => {
    const app = await NestFactory.createApplicationContext(AppModule);
    const cliService = app.get(CliService);
    await cliService.showTopChangeReady(options);
    await app.close();
  });

program
  .command('scrape')
  .description('Scrape Stellenanzeigen von advertsdata.com')
  .option('--limit <limit>', 'Anzahl Stellen', '50')
  .action(async (options) => {
    const app = await NestFactory.createApplicationContext(AppModule);
    const cliService = app.get(CliService);
    await cliService.scrapeAdvertsData(options);
    await app.close();
  });

function showHelp() {
  console.log(`
╔═══════════════════════════════════════════════════════════════╗
║                        HILFE                                  ║
╚═══════════════════════════════════════════════════════════════╝

📝 Natürliche Befehle (Beispiele):

  Kandidatensuche:
  ────────────────
  • "Suche mir Kandidaten für Java Developer Stelle"
  • "Finde Kandidaten mit Python und Django Skills"
  • "Welche Kandidaten sind wechselbereit?"
  • "Zeige mir Kandidaten mit mindestens 5 Jahren Erfahrung"

  Stellensuche:
  ────────────
  • "Finde passende Stellen für Kandidat mit Python Skills"
  • "Welche Jobs passen zu Senior Java Entwickler?"

  Wechselwilligkeit:
  ─────────────────
  • "Zeige wechselbereite Kandidaten"
  • "Wer ist Open to Work?"
  • "Top 10 Kandidaten mit höchster Wechselbereitschaft"

🔧 System-Befehle:

  • exit / quit  - Beenden
  • help         - Diese Hilfe
  `);
}

program.parse();
