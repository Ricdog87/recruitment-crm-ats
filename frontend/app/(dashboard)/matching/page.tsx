"use client";

import { useState } from "react";
import { useAuthStore } from "@/lib/auth-store";
import { useProjects, useMatching } from "@/lib/hooks/use-api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Target, Mail, Phone, MapPin } from "lucide-react";
import { Label } from "@/components/ui/label";

export default function MatchingPage() {
  const { user } = useAuthStore();
  const teamId = user?.team_memberships?.[0]?.team_id || "";
  const { data: projects } = useProjects(teamId);
  const [selectedProject, setSelectedProject] = useState<string>("");
  const [minScore, setMinScore] = useState(70);

  const { data: matches, isLoading } = useMatching(teamId, selectedProject, minScore);

  const activeProjects = projects?.filter(p => p.status === "ACTIVE") || [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Matching Engine</h1>
        <p className="mt-2 text-gray-600">
          Finden Sie die besten Kandidaten für Ihre Projekte
        </p>
      </div>

      {/* Project Selection */}
      <Card>
        <CardHeader>
          <CardTitle>Projekt auswählen</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <Label>Aktives Projekt</Label>
              <select
                className="mt-1 w-full px-3 py-2 border rounded-md"
                value={selectedProject}
                onChange={(e) => setSelectedProject(e.target.value)}
              >
                <option value="">Projekt wählen...</option>
                {activeProjects.map((project) => (
                  <option key={project.id} value={project.id}>
                    {project.title} - {project.company?.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <Label>Minimum Score: {minScore}</Label>
              <input
                type="range"
                min="0"
                max="100"
                value={minScore}
                onChange={(e) => setMinScore(Number(e.target.value))}
                className="mt-1 w-full"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Results */}
      {selectedProject && (
        <Card>
          <CardHeader>
            <CardTitle>
              {matches?.filter(m => m.hard_filters_passed).length || 0} Passende Kandidaten
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8">Matching läuft...</div>
            ) : matches && matches.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Kandidat</TableHead>
                    <TableHead>Score</TableHead>
                    <TableHead>Distanz</TableHead>
                    <TableHead>Skills</TableHead>
                    <TableHead>Kontakt</TableHead>
                    <TableHead>Grund</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {matches
                    .filter(m => m.hard_filters_passed)
                    .sort((a, b) => b.score - a.score)
                    .map((match) => (
                    <TableRow key={match.candidate_id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">
                            {match.candidate.first_name} {match.candidate.last_name}
                          </div>
                          <div className="text-sm text-gray-500">
                            {match.candidate.current_position}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="w-12 h-12 rounded-full border-4 border-primary flex items-center justify-center font-bold text-primary">
                            {match.score}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        {match.distance_km !== null ? (
                          <div className="flex items-center text-sm">
                            <MapPin className="w-3 h-3 mr-1 text-gray-400" />
                            {match.distance_km} km
                          </div>
                        ) : (
                          <span className="text-sm text-gray-500">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {match.candidate.skills.slice(0, 3).map((skill) => (
                            <span
                              key={skill}
                              className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800"
                            >
                              {skill}
                            </span>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          {match.candidate.email && (
                            <div className="flex items-center text-sm">
                              <Mail className="w-3 h-3 mr-1 text-gray-400" />
                              {match.candidate.email}
                            </div>
                          )}
                          {match.candidate.phone && (
                            <div className="flex items-center text-sm">
                              <Phone className="w-3 h-3 mr-1 text-gray-400" />
                              {match.candidate.phone}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm text-gray-600">
                          {match.short_reason}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <Target className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                <p>Wählen Sie ein Projekt aus, um Kandidaten zu finden</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
