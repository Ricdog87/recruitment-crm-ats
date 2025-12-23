import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ProjectStatus, SubmissionStatus } from '@prisma/client';

@Injectable()
export class AnalyticsService {
  constructor(private prisma: PrismaService) {}

  /**
   * Get comprehensive dashboard KPIs for a team
   */
  async getDashboardKPIs(teamId: string) {
    const [
      activeProjects,
      totalCandidates,
      activeSubmissions,
      hiredThisMonth,
      timeToFill,
      placementRate,
      submissionsByStatus,
      projectsByStatus,
      recentActivities,
      topSkills,
      revenueData,
    ] = await Promise.all([
      this.getActiveProjects(teamId),
      this.getTotalCandidates(teamId),
      this.getActiveSubmissions(teamId),
      this.getHiredThisMonth(teamId),
      this.calculateTimeToFill(teamId),
      this.calculatePlacementRate(teamId),
      this.getSubmissionsByStatus(teamId),
      this.getProjectsByStatus(teamId),
      this.getRecentActivities(teamId),
      this.getTopSkills(teamId),
      this.calculateRevenueData(teamId),
    ]);

    return {
      kpis: {
        active_projects: activeProjects,
        total_candidates: totalCandidates,
        active_submissions: activeSubmissions,
        hired_this_month: hiredThisMonth,
        time_to_fill_days: timeToFill,
        placement_rate_percent: placementRate,
      },
      pipeline: submissionsByStatus,
      projects: projectsByStatus,
      recent_activities: recentActivities,
      top_skills: topSkills,
      revenue: revenueData,
    };
  }

  /**
   * Get number of active projects
   */
  private async getActiveProjects(teamId: string): Promise<number> {
    return this.prisma.project.count({
      where: {
        team_id: teamId,
        status: ProjectStatus.ACTIVE,
      },
    });
  }

  /**
   * Get total number of candidates
   */
  private async getTotalCandidates(teamId: string): Promise<number> {
    return this.prisma.candidate.count({
      where: { team_id: teamId },
    });
  }

  /**
   * Get number of active submissions (not hired/rejected)
   */
  private async getActiveSubmissions(teamId: string): Promise<number> {
    return this.prisma.submission.count({
      where: {
        team_id: teamId,
        status: {
          notIn: [SubmissionStatus.HIRED, SubmissionStatus.REJECTED],
        },
      },
    });
  }

  /**
   * Get number of hires this month
   */
  private async getHiredThisMonth(teamId: string): Promise<number> {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    return this.prisma.submission.count({
      where: {
        team_id: teamId,
        status: SubmissionStatus.HIRED,
        updated_at: {
          gte: startOfMonth,
        },
      },
    });
  }

  /**
   * Calculate average time to fill (in days)
   */
  private async calculateTimeToFill(teamId: string): Promise<number> {
    const hiredSubmissions = await this.prisma.submission.findMany({
      where: {
        team_id: teamId,
        status: SubmissionStatus.HIRED,
      },
      select: {
        created_at: true,
        updated_at: true,
      },
      take: 100,
    });

    if (hiredSubmissions.length === 0) {
      return 0;
    }

    const totalDays = hiredSubmissions.reduce((sum, submission) => {
      const days = Math.floor(
        (submission.updated_at.getTime() - submission.created_at.getTime()) /
          (1000 * 60 * 60 * 24),
      );
      return sum + days;
    }, 0);

    return Math.round(totalDays / hiredSubmissions.length);
  }

  /**
   * Calculate placement rate (hired / total submissions)
   */
  private async calculatePlacementRate(teamId: string): Promise<number> {
    const [totalSubmissions, hiredSubmissions] = await Promise.all([
      this.prisma.submission.count({
        where: { team_id: teamId },
      }),
      this.prisma.submission.count({
        where: {
          team_id: teamId,
          status: SubmissionStatus.HIRED,
        },
      }),
    ]);

    if (totalSubmissions === 0) {
      return 0;
    }

    return Math.round((hiredSubmissions / totalSubmissions) * 100);
  }

  /**
   * Get submissions grouped by status (for pipeline visualization)
   */
  private async getSubmissionsByStatus(teamId: string) {
    const result = await this.prisma.submission.groupBy({
      by: ['status'],
      where: { team_id: teamId },
      _count: true,
    });

    return result.map((item) => ({
      status: item.status,
      count: item._count,
    }));
  }

  /**
   * Get projects grouped by status
   */
  private async getProjectsByStatus(teamId: string) {
    const result = await this.prisma.project.groupBy({
      by: ['status'],
      where: { team_id: teamId },
      _count: true,
    });

    return result.map((item) => ({
      status: item.status,
      count: item._count,
    }));
  }

  /**
   * Get recent activities (last 20)
   */
  private async getRecentActivities(teamId: string) {
    return this.prisma.activity.findMany({
      where: { team_id: teamId },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            first_name: true,
            last_name: true,
          },
        },
        candidate: {
          select: {
            id: true,
            first_name: true,
            last_name: true,
          },
        },
        project: {
          select: {
            id: true,
            title: true,
          },
        },
      },
      orderBy: { created_at: 'desc' },
      take: 20,
    });
  }

  /**
   * Get top skills across all candidates
   */
  private async getTopSkills(teamId: string, limit: number = 15) {
    const candidates = await this.prisma.candidate.findMany({
      where: { team_id: teamId },
      select: { skills: true },
    });

    // Count skill occurrences
    const skillCounts = new Map<string, number>();

    candidates.forEach((candidate) => {
      candidate.skills.forEach((skill) => {
        const normalized = skill.toLowerCase().trim();
        if (normalized) {
          skillCounts.set(normalized, (skillCounts.get(normalized) || 0) + 1);
        }
      });
    });

    // Sort by count and return top N
    return Array.from(skillCounts.entries())
      .map(([skill, count]) => ({ skill, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, limit);
  }

  /**
   * Calculate revenue data (last 6 months)
   */
  private async calculateRevenueData(teamId: string) {
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    // Get all hired submissions in the last 6 months with project salary data
    const hiredSubmissions = await this.prisma.submission.findMany({
      where: {
        team_id: teamId,
        status: SubmissionStatus.HIRED,
        updated_at: {
          gte: sixMonthsAgo,
        },
      },
      include: {
        project: {
          select: {
            salary_max: true,
          },
        },
      },
    });

    // Group by month and calculate estimated revenue (25% of annual salary)
    const revenueByMonth = new Map<string, number>();

    hiredSubmissions.forEach((submission) => {
      const month = submission.updated_at.toISOString().substring(0, 7); // YYYY-MM
      const salary = submission.project.salary_max || 0;
      const commission = salary * 0.25; // 25% commission

      revenueByMonth.set(month, (revenueByMonth.get(month) || 0) + commission);
    });

    // Fill in missing months with 0
    const result: Array<{ month: string; revenue: number }> = [];
    for (let i = 5; i >= 0; i--) {
      const date = new Date();
      date.setMonth(date.getMonth() - i);
      const month = date.toISOString().substring(0, 7);

      result.push({
        month,
        revenue: Math.round(revenueByMonth.get(month) || 0),
      });
    }

    return result;
  }

  /**
   * Get detailed analytics for a specific project
   */
  async getProjectAnalytics(projectId: string, teamId: string) {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      include: {
        submissions: {
          include: {
            candidate: {
              select: {
                id: true,
                first_name: true,
                last_name: true,
                email: true,
                skills: true,
              },
            },
          },
        },
        _count: {
          select: {
            submissions: true,
          },
        },
      },
    });

    if (!project || project.team_id !== teamId) {
      throw new Error('Project not found or access denied');
    }

    const submissionsByStatus = project.submissions.reduce((acc, sub) => {
      acc[sub.status] = (acc[sub.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return {
      project_id: project.id,
      title: project.title,
      status: project.status,
      total_submissions: project._count.submissions,
      submissions_by_status: submissionsByStatus,
      top_candidates: project.submissions
        .sort((a, b) => (b.created_at.getTime() - a.created_at.getTime()))
        .slice(0, 10)
        .map((sub) => ({
          submission_id: sub.id,
          candidate: sub.candidate,
          status: sub.status,
          submitted_at: sub.submitted_at,
        })),
    };
  }
}
