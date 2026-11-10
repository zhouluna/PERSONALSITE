import { ToolsBoard } from "@/components/tools-board";
import { readStore } from "@/lib/store";

export const dynamic = "force-dynamic";

export default function ToolsPage() {
  return <ToolsBoard initialTools={readStore().tools} />;
}
