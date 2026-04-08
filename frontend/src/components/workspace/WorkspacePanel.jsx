import ScenarioWorkspace from "../scenarios/ScenarioWorkspace"
import RemoteDesktopPanel from "./RemoteDesktopPanel" // Asegúrate de que esta ruta sea correcta según tu estructura

export default function WorkspacePanel({ item, onCompleteScenario }) {
  if (!item) return null;

  if (item.type === "scenario") {
    return (
      <ScenarioWorkspace 
        item={item} 
        onCompleteScenario={onCompleteScenario} // <-- Aquí pasamos la función para que llegue al botón
      />
    )
  }

  return <RemoteDesktopPanel item={item} />
}