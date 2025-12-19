import { useQuery, useMutation, useQueryClient, UseQueryOptions } from "@tanstack/react-query";
import apiClient from "../api-client";
import {
  Candidate,
  Company,
  Contact,
  Project,
  Submission,
  Activity,
  MatchResult,
  DashboardStats,
} from "@/types";

// Dashboard
export function useDashboard(teamId: string) {
  return useQuery({
    queryKey: ["dashboard", teamId],
    queryFn: async () => {
      const [projects, candidates, submissions, activities] = await Promise.all([
        apiClient.get(`/projects/${teamId}`),
        apiClient.get(`/candidates/${teamId}`),
        apiClient.get(`/submissions/${teamId}`),
        apiClient.get(`/activities/${teamId}`),
      ]);

      return {
        total_projects: projects.data.length,
        active_projects: projects.data.filter((p: Project) => p.status === "ACTIVE").length,
        total_candidates: candidates.data.length,
        total_submissions: submissions.data.length,
        recent_activities: activities.data.slice(0, 10),
      } as DashboardStats;
    },
  });
}

// Candidates
export function useCandidates(teamId: string) {
  return useQuery({
    queryKey: ["candidates", teamId],
    queryFn: async () => {
      const response = await apiClient.get(`/candidates/${teamId}`);
      return response.data as Candidate[];
    },
  });
}

export function useCandidate(teamId: string, candidateId: string) {
  return useQuery({
    queryKey: ["candidate", teamId, candidateId],
    queryFn: async () => {
      const response = await apiClient.get(`/candidates/${teamId}/${candidateId}`);
      return response.data as Candidate;
    },
    enabled: !!candidateId,
  });
}

export function useCreateCandidate(teamId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: Partial<Candidate>) => {
      const response = await apiClient.post(`/candidates/${teamId}`, {
        ...data,
        team_id: teamId,
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["candidates", teamId] });
    },
  });
}

export function useUpdateCandidate(teamId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<Candidate> }) => {
      const response = await apiClient.patch(`/candidates/${teamId}/${id}`, data);
      return response.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["candidates", teamId] });
      queryClient.invalidateQueries({ queryKey: ["candidate", teamId, variables.id] });
    },
  });
}

export function useDeleteCandidate(teamId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      await apiClient.delete(`/candidates/${teamId}/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["candidates", teamId] });
    },
  });
}

// Companies
export function useCompanies(teamId: string) {
  return useQuery({
    queryKey: ["companies", teamId],
    queryFn: async () => {
      const response = await apiClient.get(`/companies/${teamId}`);
      return response.data as Company[];
    },
  });
}

export function useCompany(teamId: string, companyId: string) {
  return useQuery({
    queryKey: ["company", teamId, companyId],
    queryFn: async () => {
      const response = await apiClient.get(`/companies/${teamId}/${companyId}`);
      return response.data as Company;
    },
    enabled: !!companyId,
  });
}

export function useCreateCompany(teamId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: Partial<Company>) => {
      const response = await apiClient.post(`/companies/${teamId}`, {
        ...data,
        team_id: teamId,
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["companies", teamId] });
    },
  });
}

export function useUpdateCompany(teamId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<Company> }) => {
      const response = await apiClient.patch(`/companies/${teamId}/${id}`, data);
      return response.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["companies", teamId] });
      queryClient.invalidateQueries({ queryKey: ["company", teamId, variables.id] });
    },
  });
}

export function useDeleteCompany(teamId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      await apiClient.delete(`/companies/${teamId}/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["companies", teamId] });
    },
  });
}

// Contacts
export function useContacts(teamId: string) {
  return useQuery({
    queryKey: ["contacts", teamId],
    queryFn: async () => {
      const response = await apiClient.get(`/contacts/${teamId}`);
      return response.data as Contact[];
    },
  });
}

export function useCreateContact(teamId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: Partial<Contact>) => {
      const response = await apiClient.post(`/contacts/${teamId}`, {
        ...data,
        team_id: teamId,
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contacts", teamId] });
    },
  });
}

// Projects
export function useProjects(teamId: string) {
  return useQuery({
    queryKey: ["projects", teamId],
    queryFn: async () => {
      const response = await apiClient.get(`/projects/${teamId}`);
      return response.data as Project[];
    },
  });
}

export function useProject(teamId: string, projectId: string) {
  return useQuery({
    queryKey: ["project", teamId, projectId],
    queryFn: async () => {
      const response = await apiClient.get(`/projects/${teamId}/${projectId}`);
      return response.data as Project;
    },
    enabled: !!projectId,
  });
}

export function useCreateProject(teamId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: Partial<Project>) => {
      const response = await apiClient.post(`/projects/${teamId}`, {
        ...data,
        team_id: teamId,
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects", teamId] });
    },
  });
}

export function useUpdateProject(teamId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<Project> }) => {
      const response = await apiClient.patch(`/projects/${teamId}/${id}`, data);
      return response.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["projects", teamId] });
      queryClient.invalidateQueries({ queryKey: ["project", teamId, variables.id] });
    },
  });
}

export function useDeleteProject(teamId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      await apiClient.delete(`/projects/${teamId}/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects", teamId] });
    },
  });
}

// Matching
export function useMatching(teamId: string, projectId: string, minScore: number = 0) {
  return useQuery({
    queryKey: ["matching", teamId, projectId, minScore],
    queryFn: async () => {
      const response = await apiClient.get(`/matching/${teamId}/${projectId}`, {
        params: { min_score: minScore },
      });
      return response.data as MatchResult[];
    },
    enabled: !!projectId,
  });
}

// Submissions
export function useSubmissions(teamId: string) {
  return useQuery({
    queryKey: ["submissions", teamId],
    queryFn: async () => {
      const response = await apiClient.get(`/submissions/${teamId}`);
      return response.data as Submission[];
    },
  });
}

export function useCreateSubmission(teamId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: Partial<Submission>) => {
      const response = await apiClient.post(`/submissions/${teamId}`, {
        ...data,
        team_id: teamId,
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["submissions", teamId] });
    },
  });
}

export function useUpdateSubmission(teamId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<Submission> }) => {
      const response = await apiClient.patch(`/submissions/${teamId}/${id}`, data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["submissions", teamId] });
    },
  });
}

// Activities
export function useActivities(teamId: string) {
  return useQuery({
    queryKey: ["activities", teamId],
    queryFn: async () => {
      const response = await apiClient.get(`/activities/${teamId}`);
      return response.data as Activity[];
    },
  });
}

export function useCreateActivity(teamId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: Partial<Activity>) => {
      const response = await apiClient.post(`/activities/${teamId}`, {
        ...data,
        team_id: teamId,
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["activities", teamId] });
    },
  });
}
