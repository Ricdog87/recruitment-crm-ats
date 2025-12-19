"use client";

import { useState } from "react";
import { useAuthStore } from "@/lib/auth-store";
import { useProjects, useDeleteProject } from "@/lib/hooks/use-api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Plus, Search, Briefcase, MapPin, Trash2 } from "lucide-react";
import { formatCurrency } from "@/lib/utils";

export default function ProjectsPage() {
  const { user } = useAuthStore();
  const teamId = user?.team_memberships?.[0]?.team_id || "";
  const { data: projects, isLoading } = useProjects(teamId);
  const deleteProject = useDeleteProject(teamId);
  const [searchTerm, setSearchTerm] = useState("");

  const filteredProjects = projects?.filter((project) =>
    project.title.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleDelete = async (id: string) => {
    if (confirm("Projekt wirklich löschen?")) {
      await deleteProject.mutateAsync(id);
    }
  };

  const statusColors = {
    DRAFT: "bg-gray-100 text-gray-800",
    ACTIVE: "bg-green-100 text-green-800",
    ON_HOLD: "bg-yellow-100 text-yellow-800",
    FILLED: "bg-blue-100 text-blue-800",
    CANCELLED: "bg-red-100 text-red-800",
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Projekte</h1>
          <p className="mt-2 text-gray-600">
            Verwalten Sie Ihre Recruiting-Projekte
          </p>
        </div>
        <Button>
          <Plus className="w-4 h-4 mr-2" />
          Neues Projekt
        </Button>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <Input
              placeholder="Projekte suchen..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{filteredProjects?.length || 0} Projekte</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">Laden...</div>
          ) : filteredProjects && filteredProjects.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Titel</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Skills</TableHead>
                  <TableHead>Seniority</TableHead>
                  <TableHead>Gehalt</TableHead>
                  <TableHead>Standort</TableHead>
                  <TableHead className="text-right">Aktionen</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredProjects.map((project) => (
                  <TableRow key={project.id}>
                    <TableCell>
                      <div>
                        <div className="font-medium">{project.title}</div>
                        {project.company && (
                          <div className="text-sm text-gray-500">
                            {project.company.name}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <span
                        className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${
                          statusColors[project.status]
                        }`}
                      >
                        {project.status}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {project.must_have_skills.slice(0, 2).map((skill) => (
                          <span
                            key={skill}
                            className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800"
                          >
                            {skill}
                          </span>
                        ))}
                        {project.must_have_skills.length > 2 && (
                          <span className="text-xs text-gray-500">
                            +{project.must_have_skills.length - 2}
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {project.seniority && (
                        <span className="text-sm">{project.seniority}</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {project.salary_min && project.salary_max && (
                        <div className="text-sm">
                          {formatCurrency(project.salary_min)} -{" "}
                          {formatCurrency(project.salary_max)}
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center text-sm">
                        <MapPin className="w-3 h-3 mr-1 text-gray-400" />
                        {project.work_model}
                        {project.location && ` - ${project.location}`}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(project.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-8 text-gray-500">
              Keine Projekte gefunden
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
