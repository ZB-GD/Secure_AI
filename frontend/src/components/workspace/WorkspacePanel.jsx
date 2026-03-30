import RemoteDesktopPanel from "./RemoteDesktopPanel"

export default function WorkspacePanel({ lab }) {
  return (
    <section className="flex h-full min-h-0 flex-col overflow-hidden">
      <div className="min-h-0 flex-1 overflow-hidden">
        <RemoteDesktopPanel lab={lab} />
      </div>
    </section>
  )
}