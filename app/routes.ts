import { type RouteConfig, index, route } from "@react-router/dev/routes";

export default [
  index("routes/home.tsx"),
  route("diagrams/new", "routes/diagram.tsx", { id: "diagram-new" }),
  route("diagrams/:id", "routes/diagram.tsx", { id: "diagram-edit" }),
] satisfies RouteConfig;
