import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/features/shared/components/ui/card";
import { Button } from "@/features/shared/components/ui/button";
import type { Project } from "@prisma/client";

interface ProjectsListProps {
  projects: Project[];
}

export function ProjectsList({ projects }: ProjectsListProps) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>My Projects</CardTitle>
            <CardDescription>Manage your projects</CardDescription>
          </div>
          <Button asChild>
            <Link href="/projects/new">New Project</Link>
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {!projects || projects.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-muted-foreground mb-4">No projects found</p>
            <Button asChild>
              <Link href="/projects/new">Create Your First Project</Link>
            </Button>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {projects.map((project) => (
              <Card key={project.id} className="hover:bg-muted/50 transition-colors">
                <CardHeader>
                  <CardTitle className="text-lg">{project.name}</CardTitle>
                  {project.description && (
                    <CardDescription className="line-clamp-2">
                      {project.description}
                    </CardDescription>
                  )}
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-muted-foreground">
                      Updated {new Date(project.updatedAt).toLocaleDateString()}
                    </p>
                    <Button asChild variant="outline" size="sm">
                      <Link href={`/projects/${project.id}`}>View / Edit</Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

