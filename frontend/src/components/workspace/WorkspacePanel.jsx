import ScenarioWorkspace from "../scenarios/ScenarioWorkspace";
import LabRuntimeWorkspace from "../labs/LabRuntimeWorkspace";

export default function WorkspacePanel({ item, onCompleteScenario }) {
  if (!item) return null;

  if (item.type === "scenario") {
    return (
      <ScenarioWorkspace
        item={item}
        onCompleteScenario={onCompleteScenario}
      />
    );
  }

  return <LabRuntimeWorkspace item={item} />;
}