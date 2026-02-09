import { Link } from "@tanstack/react-router";
import { Container } from "./container";

/**
 * App header component
 */
export function Header() {
  return (
    <header className="border-b border-gray-200 bg-white">
      <Container>
        <div className="flex h-16 items-center justify-between">
          <Link to="/" className="text-xl font-bold text-gray-900">
            Nobet
          </Link>

          <nav className="flex items-center gap-6">
            <Link
              to="/"
              className="text-sm font-medium text-gray-600 hover:text-gray-900"
              activeProps={{ className: "text-gray-900" }}
            >
              Home
            </Link>
            {/* Add more navigation links here */}
          </nav>
        </div>
      </Container>
    </header>
  );
}

/**
 * App footer component
 */
export function Footer() {
  return (
    <footer className="border-t border-gray-200 bg-white">
      <Container>
        <div className="py-8">
          <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
            <p className="text-sm text-gray-600">
              © {new Date().getFullYear()} Nobet. All rights reserved.
            </p>
            <div className="flex gap-6">
              <button
                type="button"
                onClick={() => {}}
                className="text-sm text-gray-600 hover:text-gray-900"
              >
                Terms
              </button>
              <button
                type="button"
                onClick={() => {}}
                className="text-sm text-gray-600 hover:text-gray-900"
              >
                Privacy
              </button>
            </div>
          </div>
        </div>
      </Container>
    </footer>
  );
}
