import Sidebar from "../layout/Sidebar";
import ScenarioWorkspace from "../scenarios/ScenarioWorkspace";
import { journey } from "../../data/journey";

export default function LabScenarioIntro({ item, onStartLab }) {
  const scenarioItem =
    journey.find((entry) => entry.id === "scenario-1") || item.scenario;

  return (
    <section
      style={{
        height: "100%",
        display: "flex",
        overflow: "hidden",
        background: "var(--bg-base)",
      }}
    >
      <Sidebar
        item={scenarioItem}
        width={360}
        onCompleteScenario={() => onStartLab?.(item.id)}
      />

      <button
        type="button"
        className="layout-resizer"
        aria-label="Resize guide and workspace"
        title="Resize guide and workspace"
      />

      <main
        style={{
          flex: 1,
          minWidth: 0,
          minHeight: 0,
          overflow: "hidden",
        }}
      >
        <ScenarioWorkspace item={scenarioItem} onCompleteScenario={() => onStartLab?.(item.id)} />
      </main>
    </section>
  );
}
