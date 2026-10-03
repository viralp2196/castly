import { createBrowserRouter } from "react-router";
import { Landing } from "./pages/Landing";
import { NotFound, RouteError } from "./pages/NotFound";
import { AppLayout, FullPageSpinner, RequireAuth } from "./pages/app/AppLayout";
import { ForgotPage, GuestOnly, LoginPage, RegisterPage, ResetPage } from "./pages/auth/AuthPages";

// Signed-in pages load on demand so the landing page stays light.
export const router = createBrowserRouter([
  {
    errorElement: <RouteError />,
    hydrateFallbackElement: <FullPageSpinner />,
    children: [
      { path: "/", element: <Landing /> },
      {
        element: <GuestOnly />,
        children: [
          { path: "/login", element: <LoginPage /> },
          { path: "/register", element: <RegisterPage /> },
          { path: "/forgot", element: <ForgotPage /> },
          { path: "/reset/:token", element: <ResetPage /> },
        ],
      },
      {
        path: "/app",
        element: <RequireAuth />,
        children: [
          {
            element: <AppLayout />,
            children: [
              { index: true, lazy: () => import("./pages/app/Dashboard").then((m) => ({ Component: m.Dashboard })) },
              { path: "projects/:id", lazy: () => import("./pages/app/studio/Studio").then((m) => ({ Component: m.Studio })) },
              { path: "library", lazy: () => import("./pages/app/Library").then((m) => ({ Component: m.Library })) },
              { path: "account", lazy: () => import("./pages/app/Account").then((m) => ({ Component: m.Account })) },
            ],
          },
        ],
      },
      { path: "*", element: <NotFound /> },
    ],
  },
]);
