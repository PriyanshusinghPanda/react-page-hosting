"use client";

import { useState, useEffect } from "react";
import axios from "axios";
import Link from "next/link";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Badge } from "../ui/badge";
import {
  Search,
  Plus,
  Globe,
  Server,
  MoreVertical,
  ExternalLink,
  Trash2,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";

interface Project {
  id: string;
  name: string;
  type: "frontend" | "backend";
  url?: string;
  status: "active" | "building" | "error";
  lastDeployed: string;
}

export function ProjectsList() {
  const [searchQuery, setSearchQuery] = useState("");
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProjects = async () => {
      try {
        const response = await api.get("/project");
        // Map the backend projects to the frontend structure
        const fetchedProjects = response.data.projects.map((p: any) => ({
          id: p._id,
          name: p.name,
          type: p.type || "frontend",
          url: p.url,
          status: p.status,
          lastDeployed: new Date(p.lastDeployed || p.createdAt).toLocaleString(),
        }));
        setProjects(fetchedProjects);
      } catch (error) {
        console.error("Failed to fetch projects", error);
      } finally {
        setLoading(false);
      }
    };

    fetchProjects();
  }, []);

  const filteredProjects = projects.filter((project) =>
    project.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="p-6 md:p-8 dot-grid min-h-full">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="mb-2">Projects 🚀</h2>
            <p className="text-muted-foreground">
              Manage and deploy your applications
            </p>
          </div>
          <Link href="/dashboard/new-project">
            <Button className="gap-2 shadow-lg hover:shadow-xl transform hover:scale-105 transition-all">
              <Plus className="w-5 h-5" />
              New Project
            </Button>
          </Link>
        </div>

        {/* Search */}
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <Input
            placeholder="Search projects..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 border-2 border-primary/20 focus:border-primary rounded-xl h-12"
          />
        </div>

        {/* Projects Grid */}
        {loading ? (
          <div className="text-center py-16">
            <h3 className="mb-2">Loading projects...</h3>
          </div>
        ) : filteredProjects.length === 0 ? (
          <div className="text-center py-16 bg-card border-2 border-border rounded-2xl">
            <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
              <Globe className="w-8 h-8 text-muted-foreground" />
            </div>
            <h3 className="mb-2">No projects found</h3>
            <p className="text-muted-foreground mb-6">
              Create your first project to get started
            </p>
            <Link href="/dashboard/new-project">
              <Button className="gap-2">
                <Plus className="w-5 h-5" />
                Create Project
              </Button>
            </Link>
          </div>
        ) : (
          <div className="grid gap-6">
            {filteredProjects.map((project, index) => (
              <div
                key={project.id}
                className="bg-card border-2 border-primary/20 rounded-2xl p-6 hover:shadow-xl transition-all transform hover:scale-[1.02]"
                style={{
                  transform: `rotate(${index % 2 === 0 ? -0.3 : 0.3}deg)`,
                }}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-4 flex-1">
                    <div
                      className={`w-12 h-12 rounded-xl flex items-center justify-center border-2 ${project.type === "frontend"
                        ? "bg-primary/10 border-primary/30"
                        : "bg-secondary/10 border-secondary/30"
                        }`}
                    >
                      {project.type === "frontend" ? (
                        <Globe className="w-6 h-6 text-primary" />
                      ) : (
                        <Server className="w-6 h-6 text-secondary" />
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="truncate">{project.name}</h3>
                        <Badge
                          variant="outline"
                          className={
                            project.status === "active"
                              ? "bg-secondary/10 text-secondary border-secondary/30"
                              : project.status === "building"
                                ? "bg-accent/10 text-accent-foreground border-accent/30"
                                : "bg-destructive/10 text-destructive border-destructive/30"
                          }
                        >
                          {project.status}
                        </Badge>
                      </div>

                      {project.url && (
                        <a
                          href={project.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 text-sm text-primary hover:underline mb-2"
                        >
                          <ExternalLink className="w-3 h-3" />
                          {project.url}
                        </a>
                      )}

                      <p className="text-sm text-muted-foreground">
                        Last deployed {project.lastDeployed}
                      </p>
                    </div>
                  </div>

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <MoreVertical className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem>View Details</DropdownMenuItem>
                      <DropdownMenuItem>Settings</DropdownMenuItem>
                      <DropdownMenuItem className="text-destructive">
                        <Trash2 className="w-4 h-4 mr-2" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}