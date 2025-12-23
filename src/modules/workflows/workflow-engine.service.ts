import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaService } from '../prisma/prisma.service';
import { WorkflowTriggerType, WorkflowActionType } from '@prisma/client';

export interface WorkflowEvent {
  type: WorkflowTriggerType;
  teamId: string;
  data: any;
  metadata?: Record<string, any>;
}

interface WorkflowAction {
  type: WorkflowActionType;
  config: any;
}

@Injectable()
export class WorkflowEngineService implements OnModuleInit {
  private readonly logger = new Logger(WorkflowEngineService.name);

  constructor(
    private prisma: PrismaService,
    private eventEmitter: EventEmitter2,
  ) {}

  onModuleInit() {
    // Register event listeners for each trigger type
    this.registerEventListeners();
  }

  /**
   * Register listeners for all workflow trigger types
   */
  private registerEventListeners() {
    // Submission status changed
    this.eventEmitter.on('submission.status.changed', (event: WorkflowEvent) => {
      this.handleEvent(WorkflowTriggerType.SUBMISSION_STATUS_CHANGED, event);
    });

    // Candidate created
    this.eventEmitter.on('candidate.created', (event: WorkflowEvent) => {
      this.handleEvent(WorkflowTriggerType.CANDIDATE_CREATED, event);
    });

    // Project status changed
    this.eventEmitter.on('project.status.changed', (event: WorkflowEvent) => {
      this.handleEvent(WorkflowTriggerType.PROJECT_STATUS_CHANGED, event);
    });

    // Document uploaded
    this.eventEmitter.on('document.uploaded', (event: WorkflowEvent) => {
      this.handleEvent(WorkflowTriggerType.DOCUMENT_UPLOADED, event);
    });

    this.logger.log('Workflow engine initialized and listening for events');
  }

  /**
   * Handle an event and trigger matching workflows
   */
  private async handleEvent(triggerType: WorkflowTriggerType, event: WorkflowEvent) {
    try {
      // Find active workflows for this trigger type and team
      const workflows = await this.prisma.workflow.findMany({
        where: {
          team_id: event.teamId,
          trigger_type: triggerType,
          is_active: true,
        },
      });

      if (workflows.length === 0) {
        return;
      }

      this.logger.log(`Found ${workflows.length} workflows for trigger ${triggerType}`);

      // Execute each matching workflow
      for (const workflow of workflows) {
        // Check if trigger conditions are met
        if (!this.checkTriggerConditions(workflow.trigger_config as any, event.data)) {
          continue;
        }

        // Execute workflow actions
        this.executeWorkflow(workflow.id, workflow.actions as any, event)
          .catch((error) => {
            this.logger.error(
              `Workflow execution failed for ${workflow.id}: ${error.message}`,
              error.stack,
            );
          });
      }
    } catch (error) {
      this.logger.error(`Event handling failed: ${error.message}`, error.stack);
    }
  }

  /**
   * Check if trigger conditions are met
   */
  private checkTriggerConditions(config: any, data: any): boolean {
    if (!config || !config.conditions) {
      return true; // No conditions = always trigger
    }

    const { conditions } = config;

    // Simple condition checking (can be extended)
    for (const condition of conditions) {
      const { field, operator, value } = condition;
      const dataValue = this.getNestedValue(data, field);

      switch (operator) {
        case 'equals':
          if (dataValue !== value) return false;
          break;
        case 'not_equals':
          if (dataValue === value) return false;
          break;
        case 'contains':
          if (!String(dataValue).includes(value)) return false;
          break;
        case 'greater_than':
          if (Number(dataValue) <= Number(value)) return false;
          break;
        case 'less_than':
          if (Number(dataValue) >= Number(value)) return false;
          break;
        default:
          this.logger.warn(`Unknown operator: ${operator}`);
      }
    }

    return true;
  }

  /**
   * Execute a workflow's actions
   */
  private async executeWorkflow(workflowId: string, actions: WorkflowAction[], event: WorkflowEvent) {
    let success = true;
    let errorMessage: string | null = null;

    try {
      this.logger.log(`Executing workflow ${workflowId} with ${actions.length} actions`);

      for (const action of actions) {
        await this.executeAction(action, event);
      }
    } catch (error) {
      success = false;
      errorMessage = error.message;
      this.logger.error(`Workflow ${workflowId} execution failed: ${error.message}`);
    } finally {
      // Log workflow execution
      await this.prisma.workflowLog.create({
        data: {
          workflow_id: workflowId,
          team_id: event.teamId,
          triggered_by: JSON.stringify(event.metadata || {}),
          success,
          error_message: errorMessage,
        },
      });
    }
  }

  /**
   * Execute a single action
   */
  private async executeAction(action: WorkflowAction, event: WorkflowEvent) {
    this.logger.debug(`Executing action: ${action.type}`);

    switch (action.type) {
      case WorkflowActionType.SEND_EMAIL:
        await this.executeSendEmailAction(action.config, event);
        break;

      case WorkflowActionType.CREATE_ACTIVITY:
        await this.executeCreateActivityAction(action.config, event);
        break;

      case WorkflowActionType.UPDATE_FIELD:
        await this.executeUpdateFieldAction(action.config, event);
        break;

      case WorkflowActionType.WEBHOOK:
        await this.executeWebhookAction(action.config, event);
        break;

      default:
        this.logger.warn(`Unknown action type: ${action.type}`);
    }
  }

  /**
   * Action: Send Email
   */
  private async executeSendEmailAction(config: any, event: WorkflowEvent) {
    this.logger.log(`[SEND_EMAIL] To: ${config.to}, Subject: ${config.subject}`);

    // TODO: Integrate with email service (Nodemailer, SendGrid, etc.)
    // For now, just log the email
    const emailData = {
      to: this.replaceVariables(config.to, event.data),
      subject: this.replaceVariables(config.subject, event.data),
      body: this.replaceVariables(config.body, event.data),
    };

    this.logger.debug(`Email data: ${JSON.stringify(emailData)}`);

    // Example integration with Nodemailer:
    // const transporter = nodemailer.createTransporter({ ... });
    // await transporter.sendMail({
    //   from: config.from,
    //   to: emailData.to,
    //   subject: emailData.subject,
    //   html: emailData.body,
    // });
  }

  /**
   * Action: Create Activity
   */
  private async executeCreateActivityAction(config: any, event: WorkflowEvent) {
    const { type, subject, body, entity_type, entity_id } = config;

    // Get a user to attribute the activity to (first admin/manager in the team)
    const teamMember = await this.prisma.teamMember.findFirst({
      where: {
        team_id: event.teamId,
        role: { in: ['ADMIN', 'MANAGER'] },
      },
    });

    if (!teamMember) {
      throw new Error('No admin/manager found to create activity');
    }

    const activityData: any = {
      team_id: event.teamId,
      user_id: teamMember.user_id,
      type: type || 'NOTE',
      subject: this.replaceVariables(subject, event.data),
      body: this.replaceVariables(body || '', event.data),
    };

    // Link to entity if specified
    if (entity_type && entity_id) {
      const resolvedEntityId = this.replaceVariables(entity_id, event.data);

      switch (entity_type) {
        case 'candidate':
          activityData.candidate_id = resolvedEntityId;
          break;
        case 'project':
          activityData.project_id = resolvedEntityId;
          break;
        case 'submission':
          activityData.submission_id = resolvedEntityId;
          break;
        case 'contact':
          activityData.contact_id = resolvedEntityId;
          break;
      }
    }

    await this.prisma.activity.create({ data: activityData });

    this.logger.log(`[CREATE_ACTIVITY] Created activity: ${subject}`);
  }

  /**
   * Action: Update Field
   */
  private async executeUpdateFieldAction(config: any, event: WorkflowEvent) {
    const { entity_type, entity_id, field, value } = config;

    const resolvedEntityId = this.replaceVariables(entity_id, event.data);
    const resolvedValue = this.replaceVariables(value, event.data);

    switch (entity_type) {
      case 'submission':
        await this.prisma.submission.update({
          where: { id: resolvedEntityId },
          data: { [field]: resolvedValue },
        });
        break;

      case 'candidate':
        await this.prisma.candidate.update({
          where: { id: resolvedEntityId },
          data: { [field]: resolvedValue },
        });
        break;

      case 'project':
        await this.prisma.project.update({
          where: { id: resolvedEntityId },
          data: { [field]: resolvedValue },
        });
        break;

      default:
        throw new Error(`Unknown entity type: ${entity_type}`);
    }

    this.logger.log(`[UPDATE_FIELD] Updated ${entity_type}.${field} = ${resolvedValue}`);
  }

  /**
   * Action: Webhook
   */
  private async executeWebhookAction(config: any, event: WorkflowEvent) {
    const { url, method, headers, body } = config;

    const resolvedUrl = this.replaceVariables(url, event.data);
    const resolvedBody = body ? this.replaceVariables(JSON.stringify(body), event.data) : null;

    const response = await fetch(resolvedUrl, {
      method: method || 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
      body: resolvedBody,
    });

    if (!response.ok) {
      throw new Error(`Webhook failed: ${response.status} ${response.statusText}`);
    }

    this.logger.log(`[WEBHOOK] Called ${method} ${resolvedUrl} - ${response.status}`);
  }

  /**
   * Replace variables in text with actual values from event data
   */
  private replaceVariables(text: string, data: any): string {
    if (typeof text !== 'string') {
      return text;
    }

    return text.replace(/\{\{([^}]+)\}\}/g, (match, path) => {
      const value = this.getNestedValue(data, path.trim());
      return value !== undefined ? String(value) : match;
    });
  }

  /**
   * Get nested value from object using dot notation
   */
  private getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => current?.[key], obj);
  }
}
