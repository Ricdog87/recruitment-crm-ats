"use client";

import { useState } from "react";
import { useAuthStore } from "@/lib/auth-store";
import { useCompanies, useDeleteCompany } from "@/lib/hooks/use-api";
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
import { Plus, Search, Globe, MapPin, Trash2 } from "lucide-react";

export default function CompaniesPage() {
  const { user } = useAuthStore();
  const teamId = user?.team_memberships?.[0]?.team_id || "";
  const { data: companies, isLoading } = useCompanies(teamId);
  const deleteCompany = useDeleteCompany(teamId);
  const [searchTerm, setSearchTerm] = useState("");

  const filteredCompanies = companies?.filter((company) =>
    company.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleDelete = async (id: string) => {
    if (confirm("Unternehmen wirklich löschen?")) {
      await deleteCompany.mutateAsync(id);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Unternehmen</h1>
          <p className="mt-2 text-gray-600">
            Verwalten Sie Ihre Kunden und Partner
          </p>
        </div>
        <Button>
          <Plus className="w-4 h-4 mr-2" />
          Neues Unternehmen
        </Button>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <Input
              placeholder="Unternehmen suchen..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{filteredCompanies?.length || 0} Unternehmen</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">Laden...</div>
          ) : filteredCompanies && filteredCompanies.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Branche</TableHead>
                  <TableHead>Größe</TableHead>
                  <TableHead>Standort</TableHead>
                  <TableHead>Website</TableHead>
                  <TableHead className="text-right">Aktionen</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCompanies.map((company) => (
                  <TableRow key={company.id}>
                    <TableCell className="font-medium">
                      {company.name}
                    </TableCell>
                    <TableCell>{company.industry || "-"}</TableCell>
                    <TableCell>{company.size || "-"}</TableCell>
                    <TableCell>
                      {company.location && (
                        <div className="flex items-center text-sm">
                          <MapPin className="w-3 h-3 mr-1 text-gray-400" />
                          {company.location}
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      {company.website && (
                        <a
                          href={company.website}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center text-sm text-blue-600 hover:underline"
                        >
                          <Globe className="w-3 h-3 mr-1" />
                          Website
                        </a>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(company.id)}
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
              Keine Unternehmen gefunden
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
