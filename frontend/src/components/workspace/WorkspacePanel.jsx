import ScenarioWorkspace from "../scenarios/ScenarioWorkspace";
import RemoteDesktopPanel from "./RemoteDesktopPanel";
import LabRuntimeWorkspace from "../labs/LabRuntimeWorkspace";
import Lab1Workspace from "./Lab1Workspace";

export default function WorkspacePanel({ item, onCompleteScenario }) {
  if (!item) return null;

  if (item.type === "scenario") {
    return (
      <ScenarioWorkspace item={item} onCompleteScenario={onCompleteScenario} />
    );
  }

  if (item.id === "lab-1") {
    return <Lab1Workspace item={item} />;
  }

  if (item.type === "lab") {
    return <LabRuntimeWorkspace item={item} />;
  }

  return <RemoteDesktopPanel item={item} />;
}
