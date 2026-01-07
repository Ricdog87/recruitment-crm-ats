"use client";

import { useAuthStore } from "@/lib/auth-store";
import { useDashboard } from "@/lib/hooks/use-api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Building2, Briefcase, Send, TrendingUp } from "lucide-react";
import { formatDateTime } from "@/lib/utils";

export default function DashboardPage() {
  const { user } = useAuthStore();
  const teamId = user?.team_memberships?.[0]?.team_id || "";
  const { data: stats, isLoading } = useDashboard(teamId);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg">Laden...</div>
      </div>
    );
  }

  if (!stats) {
    return <div>Keine Daten verfügbar</div>;
  }

  const kpis = [
    {
      title: "Projekte gesamt",
      value: stats.total_projects,
      icon: Briefcase,
      description: `${stats.active_projects} aktiv`,
      color: "text-blue-600",
      bg: "bg-blue-50",
    },
    {
      title: "Kandidaten",
      value: stats.total_candidates,
      icon: Users,
      description: "Im System",
      color: "text-green-600",
      bg: "bg-green-50",
    },
    {
      title: "Submissions",
      value: stats.total_submissions,
      icon: Send,
      description: "Vorgeschlagen",
      color: "text-purple-600",
      bg: "bg-purple-50",
    },
    {
      title: "Erfolgsrate",
      value: stats.total_submissions > 0
        ? `${Math.round((stats.total_submissions / stats.total_projects) * 100)}%`
        : "0%",
      icon: TrendingUp,
      description: "Submissions/Projekt",
      color: "text-orange-600",
      bg: "bg-orange-50",
    },
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        <p className="mt-2 text-gray-600">
          Übersicht über Ihre Recruiting-Aktivitäten
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {kpis.map((kpi) => (
          <Card key={kpi.title}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                {kpi.title}
              </CardTitle>
              <div className={`p-2 rounded-lg ${kpi.bg}`}>
                <kpi.icon className={`w-5 h-5 ${kpi.color}`} />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{kpi.value}</div>
              <p className="text-xs text-gray-500 mt-1">{kpi.description}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Recent Activities */}
      <Card>
        <CardHeader>
          <CardTitle>Letzte Aktivitäten</CardTitle>
        </CardHeader>
        <CardContent>
          {stats.recent_activities && stats.recent_activities.length > 0 ? (
            <div className="space-y-4">
              {stats.recent_activities.map((activity) => (
                <div
                  key={activity.id}
                  className="flex items-start gap-4 pb-4 border-b last:border-0"
                >
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <div className="w-2 h-2 rounded-full bg-primary"></div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900">
                      {activity.description}
                    </p>
                    {activity.notes && (
                      <p className="text-sm text-gray-500 mt-1">
                        {activity.notes}
                      </p>
                    )}
                    <p className="text-xs text-gray-400 mt-1">
                      {formatDateTime(activity.created_at)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-500 text-center py-8">
              Noch keine Aktivitäten vorhanden
            </p>
          )}
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Schnellzugriff</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <a
              href="/candidates"
              className="p-4 border rounded-lg hover:border-primary hover:bg-primary/5 transition-colors"
            >
              <Users className="w-6 h-6 text-primary mb-2" />
              <h3 className="font-medium">Kandidaten verwalten</h3>
              <p className="text-sm text-gray-500 mt-1">
                Kandidaten hinzufügen und bearbeiten
              </p>
            </a>
            <a
              href="/companies"
              className="p-4 border rounded-lg hover:border-primary hover:bg-primary/5 transition-colors"
            >
              <Building2 className="w-6 h-6 text-primary mb-2" />
              <h3 className="font-medium">Unternehmen verwalten</h3>
              <p className="text-sm text-gray-500 mt-1">
                Unternehmen und Kontakte pflegen
              </p>
            </a>
            <a
              href="/projects"
              className="p-4 border rounded-lg hover:border-primary hover:bg-primary/5 transition-colors"
            >
              <Briefcase className="w-6 h-6 text-primary mb-2" />
              <h3 className="font-medium">Projekte starten</h3>
              <p className="text-sm text-gray-500 mt-1">
                Neue Recruiting-Projekte anlegen
              </p>
            </a>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
