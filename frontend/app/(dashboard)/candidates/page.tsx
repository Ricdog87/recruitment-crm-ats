"use client";

import { useState } from "react";
import { useAuthStore } from "@/lib/auth-store";
import { useCandidates, useDeleteCandidate } from "@/lib/hooks/use-api";
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
import { Plus, Search, Mail, Phone, Trash2 } from "lucide-react";
import { Candidate } from "@/types";

export default function CandidatesPage() {
  const { user } = useAuthStore();
  const teamId = user?.team_memberships?.[0]?.team_id || "";
  const { data: candidates, isLoading } = useCandidates(teamId);
  const deleteCandidate = useDeleteCandidate(teamId);
  const [searchTerm, setSearchTerm] = useState("");

  const filteredCandidates = candidates?.filter((candidate) =>
    `${candidate.first_name} ${candidate.last_name} ${candidate.email}`
      .toLowerCase()
      .includes(searchTerm.toLowerCase())
  );

  const handleDelete = async (id: string) => {
    if (confirm("Kandidat wirklich löschen?")) {
      await deleteCandidate.mutateAsync(id);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Kandidaten</h1>
          <p className="mt-2 text-gray-600">
            Verwalten Sie Ihre Kandidaten-Datenbank
          </p>
        </div>
        <Button>
          <Plus className="w-4 h-4 mr-2" />
          Neuer Kandidat
        </Button>
      </div>

      {/* Search */}
      <Card>
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <Input
              placeholder="Kandidaten suchen..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardHeader>
          <CardTitle>
            {filteredCandidates?.length || 0} Kandidaten
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">Laden...</div>
          ) : filteredCandidates && filteredCandidates.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Kontakt</TableHead>
                  <TableHead>Skills</TableHead>
                  <TableHead>Seniority</TableHead>
                  <TableHead>Standort</TableHead>
                  <TableHead className="text-right">Aktionen</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCandidates.map((candidate) => (
                  <TableRow key={candidate.id}>
                    <TableCell>
                      <div>
                        <div className="font-medium">
                          {candidate.first_name} {candidate.last_name}
                        </div>
                        {candidate.current_position && (
                          <div className="text-sm text-gray-500">
                            {candidate.current_position}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        {candidate.email && (
                          <div className="flex items-center text-sm">
                            <Mail className="w-3 h-3 mr-1 text-gray-400" />
                            {candidate.email}
                          </div>
                        )}
                        {candidate.phone && (
                          <div className="flex items-center text-sm">
                            <Phone className="w-3 h-3 mr-1 text-gray-400" />
                            {candidate.phone}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {candidate.skills.slice(0, 3).map((skill) => (
                          <span
                            key={skill}
                            className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800"
                          >
                            {skill}
                          </span>
                        ))}
                        {candidate.skills.length > 3 && (
                          <span className="text-xs text-gray-500">
                            +{candidate.skills.length - 3}
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {candidate.seniority && (
                        <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-gray-100 text-gray-800">
                          {candidate.seniority}
                        </span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        {candidate.location || "-"}
                        {candidate.plz && ` (${candidate.plz})`}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(candidate.id)}
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
              Keine Kandidaten gefunden
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
