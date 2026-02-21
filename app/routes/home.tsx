import type { Route } from "./+types/home";
import DiagramEditor from "../components/DiagramEditor";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "DiagramCraft — Code → Diagram" },
    { name: "description", content: "DSLベースのダイアグラムエディタ" },
  ];
}

export default function Home() {
  return <DiagramEditor />;
}
