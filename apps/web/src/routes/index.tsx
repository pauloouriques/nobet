import { trpc } from "@nobet/api-client";
import { APP_NAME } from "@nobet/shared";
import { createFileRoute } from "@tanstack/react-router";
import { Container } from "../components/container";
import { LoadingInline } from "../components/loading";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";

export const Route = createFileRoute("/")({
  component: IndexComponent,
});

function IndexComponent() {
  const healthQuery = trpc.health.check.useQuery();

  return (
    <Container className="py-12">
      <div className="space-y-8">
        {/* Hero Section */}
        <div className="text-center">
          <h1 className="text-4xl font-bold tracking-tight text-gray-900 sm:text-6xl">
            Welcome to {APP_NAME}
          </h1>
          <p className="mt-6 text-lg leading-8 text-gray-600">
            A modern full-stack TypeScript monorepo boilerplate
          </p>
          <div className="mt-10 flex items-center justify-center gap-4">
            <Button size="lg">Get Started</Button>
            <Button size="lg" variant="outline">
              Learn More
            </Button>
          </div>
        </div>

        {/* Features Grid */}
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          <Card>
            <CardHeader>
              <CardTitle>TypeScript</CardTitle>
              <CardDescription>End-to-end type safety</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600">
                Full type safety from database to UI with tRPC and Drizzle ORM
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Modern Stack</CardTitle>
              <CardDescription>Best-in-class tools</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600">
                React, Vite, Hono, TanStack Router, and Tailwind CSS v4
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Ready to Deploy</CardTitle>
              <CardDescription>Vercel optimized</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600">
                Configured for Vercel deployment with proper environment handling
              </p>
            </CardContent>
          </Card>
        </div>

        {/* API Health Check */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>API Health Check</CardTitle>
              <Badge variant={healthQuery.data?.status === "ok" ? "default" : "secondary"}>
                {healthQuery.data?.status === "ok" ? "Connected" : "Loading..."}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            {healthQuery.isLoading && <LoadingInline message="Checking API..." />}
            {healthQuery.error && (
              <p className="text-sm text-red-600">
                Failed to connect to API: {healthQuery.error.message}
              </p>
            )}
            {healthQuery.data && (
              <div className="space-y-2 text-sm">
                <p>
                  <span className="font-medium">Status:</span>{" "}
                  <span className="text-green-600">{healthQuery.data.status}</span>
                </p>
                <p>
                  <span className="font-medium">Timestamp:</span>{" "}
                  <span className="text-gray-600">
                    {new Date(healthQuery.data.timestamp).toLocaleString()}
                  </span>
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        <p className="text-center text-sm text-gray-600">
          The full stack is working! React + Vite + tRPC + Hono + Drizzle + PostgreSQL
        </p>
      </div>
    </Container>
  );
}
