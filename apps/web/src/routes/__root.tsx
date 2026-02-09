import { Outlet, createRootRoute } from "@tanstack/react-router";
import { ErrorBoundary } from "../components/error-boundary";
import { Footer, Header } from "../components/layout";

export const Route = createRootRoute({
  component: () => (
    <ErrorBoundary>
      <div className="flex min-h-screen flex-col bg-gray-50">
        <Header />
        <main className="flex-1">
          <Outlet />
        </main>
        <Footer />
      </div>
    </ErrorBoundary>
  ),
});
