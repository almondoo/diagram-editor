import type { Route } from "./+types/home";
import { DiagramEditor } from "diagram-dsl-react";

export function meta(_: Route.MetaArgs) {
  return [
    { title: "DiagramCraft — Code → Diagram" },
    { name: "description", content: "DSLベースのダイアグラムエディタ" },
  ];
}

export default function Home() {
  return <DiagramEditor />;
}
