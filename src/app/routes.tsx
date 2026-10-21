import { createBrowserRouter } from "react-router"
import { StudioLayout } from "./components/StudioLayout"

export const router = createBrowserRouter([
  {
    path: "/",
    lazy: async () => ({
      Component: (await import("./pages/HomePage")).default,
    }),
  },
  {
    Component: StudioLayout,
    children: [
      {
        path: "dashboard",
        lazy: async () => ({
          Component: (await import("./pages/DashboardPage")).default,
        }),
      },
      {
        path: "create-packaging",
        lazy: async () => ({
          Component: (await import("./pages/CreatePackagingPage")).default,
        }),
      },
      {
        path: "workspace",
        lazy: async () => ({
          Component: (await import("./pages/WorkspacePage")).default,
        }),
      },
      {
        path: "optimize",
        lazy: async () => ({
          Component: (await import("./pages/OptimizePage")).default,
        }),
      },
      {
        path: "green-impact",
        lazy: async () => ({
          Component: (await import("./pages/GreenImpactPage")).default,
        }),
      },
      {
        path: "export",
        lazy: async () => ({
          Component: (await import("./pages/ExportPage")).default,
        }),
      },
    ],
  },
  {
    path: "*",
    lazy: async () => ({
      Component: (await import("./pages/HomePage")).default,
    }),
  },
])
