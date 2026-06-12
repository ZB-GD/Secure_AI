import { useEffect, useRef, useState } from "react";
import RagTutorWidget from "../workspace/RagTutorWidget";
import { useAuth } from "../../context/AuthContext";

const LAST_LAB_STORAGE_KEY = "seclabs:last-lab-id";

function AccountMenu({ user, isAdmin, onSelectItem, logout }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  const initial = user?.username?.[0]?.toUpperCase() || "?";

  useEffect(() => {
    if (!open) return;
    function handleClick(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  const menuItem = (label, onClick, opts = {}) => (
    <button
      key={label}
      type="button"
      onClick={() => {
        onClick();
        setOpen(false);
      }}
      style={{
        width: "100%",
        padding: "11px 18px",
        border: "none",
        background: "transparent",
        color: opts.danger ? "#f87171" : "var(--text-1)",
        fontFamily: "var(--font-display)",
        fontSize: "15px",
        textAlign: "left",
        cursor: "pointer",
        display: "flex",
        alignItems: "center",
        gap: "12px",
        transition: "background 0.1s",
        borderRadius: "6px",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = opts.danger
          ? "rgba(239,68,68,0.08)"
          : "rgba(255,255,255,0.05)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = "transparent";
      }}
    >
      {opts.icon && (
        <span style={{ fontSize: "17px", opacity: 0.7 }}>{opts.icon}</span>
      )}
      {label}
    </button>
  );

  return (
    <div ref={ref} style={{ position: "relative" }}>
      {/* Avatar button */}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        title={user?.username}
        style={{
          width: "44px",
          height: "44px",
          borderRadius: "50%",
          border: open
            ? "2px solid var(--orange)"
            : "2px solid var(--border-dim)",
          background: open ? "var(--orange-dim)" : "rgba(255,255,255,0.05)",
          color: open ? "var(--orange)" : "var(--text-2)",
          fontFamily: "var(--font-display)",
          fontSize: "17px",
          fontWeight: 700,
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          transition: "all 0.15s",
          flexShrink: 0,
        }}
      >
        {initial}
      </button>

      {/* Dropdown */}
      {open && (
        <div
          style={{
            position: "absolute",
            top: "calc(100% + 8px)",
            right: 0,
            width: "260px",
            background: "var(--bg-panel)",
            border: "1px solid var(--border-dim)",
            borderRadius: "10px",
            boxShadow: "0 8px 32px rgba(0,0,0,0.35)",
            zIndex: 100,
            overflow: "hidden",
          }}
        >
          {/* User info header */}
          <div
            style={{
              padding: "16px 20px",
              borderBottom: "1px solid var(--border-dim)",
            }}
          >
            <div
              style={{
                fontSize: "15px",
                fontWeight: 600,
                color: "var(--text-1)",
                fontFamily: "var(--font-display)",
                marginBottom: "6px",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {user?.username}
            </div>
            <span
              style={{
                display: "inline-block",
                padding: "3px 10px",
                borderRadius: "4px",
                background: isAdmin
                  ? "rgba(249,115,22,0.12)"
                  : "rgba(56,189,248,0.08)",
                color: isAdmin ? "var(--orange)" : "var(--blue)",
                fontSize: "12px",
                fontWeight: 600,
                fontFamily: "var(--font-display)",
              }}
            >
              {isAdmin ? "Admin" : "Student"}
            </span>
          </div>

          {/* Menu items */}
          <div style={{ padding: "6px" }}>
            {menuItem("Profile", () => onSelectItem("profile"), { icon: "◎" })}
            {isAdmin &&
              menuItem("Admin panel", () => onSelectItem("admin"), {
                icon: "⚙",
              })}
            <div
              style={{
                height: "1px",
                background: "var(--border-dim)",
                margin: "6px 0",
              }}
            />
            {menuItem("Sign out", logout, { icon: "›", danger: true })}
          </div>
        </div>
      )}
    </div>
  );
}

export default function TopBar({
  items,
  activeItem,
  onSelectItem,
}) {
  const { user, logout } = useAuth();
  const isAdmin = user?.role === "admin";
  const navRef = useRef(null);
  const tabRefs = useRef([]);
  const [pillPos, setPillPos] = useState({ left: 0, width: 0 });
  const [pillVisible, setPillVisible] = useState(false);
  const labs = items.filter((i) => i.type === "lab");

  const activeId = typeof activeItem === "string" ? activeItem : activeItem?.id;

  const [lastLabId, setLastLabId] = useState(
    () => localStorage.getItem(LAST_LAB_STORAGE_KEY) || "",
  );

  const unlockedLabs = labs.filter((lab) => lab.scenarioViewed);
  const lastUnlockedLab = unlockedLabs[unlockedLabs.length - 1] || null;

  const firstAvailableLab =
    labs.find((lab) => lab.guide?.steps?.length) || labs[0] || null;

  const pipelineUnlocked = items.some(
    (item) => item.id === "scenario-1" && item.completed,
  );

  const currentLab =
    activeItem?.type === "lab"
      ? activeItem
      : labs.find((lab) => lab.id === lastLabId) || lastUnlockedLab || null;

  const labTabTarget = currentLab || lastUnlockedLab || firstAvailableLab;

  const isActuallyInsideLab = activeItem?.type === "lab";

  const currentLabLabel =
    isActuallyInsideLab && currentLab
      ? `LAB - ${currentLab.shortTitle.replace(/^Lab\s*/i, "")} ${currentLab.title}`
      : "LABS";

  const activeNavId =
    activeItem?.type === "docs" || activeId === "docs"
      ? "docs"
      : activeItem?.type === "lab"
        ? "labs"
        : activeItem?.id === "scenario-1" || activeItem?.type === "pipeline"
          ? "scenarios"
          : "home";

  useEffect(() => {
    if (activeItem?.type !== "lab") return;
    setLastLabId(activeItem.id);
    localStorage.setItem(LAST_LAB_STORAGE_KEY, activeItem.id);
  }, [activeItem]);

  const navTabs = [
    {
      id: "home",
      label: "DASHBOARD",
    },
    {
      id: "labs",
      label: currentLabLabel,
      disabled: !lastUnlockedLab,
      tooltip: !lastUnlockedLab
        ? "Start a lab from the Dashboard to unlock"
        : undefined,
    },
    {
      id: "scenarios",
      label: "PIPELINE",
      disabled: !pipelineUnlocked,
      tooltip: !pipelineUnlocked
        ? "Complete Lab 1 to unlock the pipeline view"
        : undefined,
    },
    {
      id: "docs",
      label: "DOCS",
    },
  ];

  useEffect(() => {
    const activeIndex = navTabs.findIndex((t) => t.id === activeNavId);
    const el = tabRefs.current[activeIndex];
    const nav = navRef.current;
    if (!el || !nav) return;
    const navRect = nav.getBoundingClientRect();
    const elRect = el.getBoundingClientRect();
    setPillPos({ left: elRect.left - navRect.left, width: elRect.width });
    setPillVisible(true);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeNavId, currentLabLabel]);

  function goHome() {
    onSelectItem("dashboard");
  }

  function handleTabClick(tab) {
    if (tab.disabled) return;

    if (tab.id === "home") {
      onSelectItem("dashboard");
      return;
    }

    if (tab.id === "scenarios") {
      if (!pipelineUnlocked) return;
      onSelectItem("scenario-1");
      return;
    }

    if (tab.id === "labs") {
      if (!labTabTarget) return;
      onSelectItem(labTabTarget.id);
      return;
    }

    if (tab.id === "docs") {
      onSelectItem({ id: "docs", type: "docs", docPath: null, docId: null });
    }
  }

  return (
    <header
      style={{
        flexShrink: 0,
        background: "var(--bg-panel)",
        borderBottom: "1px solid var(--border-dim)",
      }}
    >
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr auto 1fr",
          alignItems: "center",
          padding: "16px 28px",
          gap: "22px",
        }}
      >
        {/* Logo */}
        <button
          type="button"
          onClick={goHome}
          title="Go to home"
          style={{
            display: "flex",
            alignItems: "center",
            gap: "14px",
            minWidth: "220px",
            width: "fit-content",
            border: "none",
            background: "transparent",
            padding: 0,
            cursor: "pointer",
            textAlign: "left",
          }}
        >
          <div
            style={{
              width: "42px",
              height: "42px",
              borderRadius: "10px",
              background: "var(--orange-dim)",
              border: "1px solid var(--orange-border)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "0 0 10px rgba(249,115,22,0.15)",
              flexShrink: 0,
            }}
          >
            <span
              style={{
                color: "var(--orange)",
                fontSize: "13px",
                fontWeight: 600,
                fontFamily: "var(--font-mono)",
              }}
            >
              AI
            </span>
          </div>
          <div>
            <div
              style={{
                fontSize: "17px",
                fontWeight: 700,
                fontFamily: "var(--font-display)",
                color: "var(--text-1)",
              }}
            >
              SEC<span style={{ color: "var(--orange)" }}>LABS</span>
            </div>
            <div
              style={{
                fontSize: "12px",
                color: "var(--text-3)",
                fontFamily: "var(--font-mono)",
              }}
            >
              AI SECURITY TRAINING
            </div>
          </div>
        </button>

        {/* Nav tabs */}
        <nav
          ref={navRef}
          aria-label="Main navigation"
          style={{
            position: "relative",
            display: "inline-flex",
            border: "1px solid var(--border-dim)",
            borderRadius: "12px",
            background: "rgba(15,23,42,0.95)",
            justifySelf: "center",
            boxShadow: "0 0 18px rgba(0,0,0,0.22)",
            padding: "4px",
            gap: "2px",
          }}
        >
          {/* Sliding pill */}
          {pillVisible && (
            <div
              style={{
                position: "absolute",
                top: "4px",
                bottom: "4px",
                left: pillPos.left,
                width: pillPos.width,
                borderRadius: "8px",
                background:
                  activeNavId === "scenarios" || activeNavId === "docs"
                    ? "rgba(56,189,248,0.13)"
                    : "var(--orange-dim)",
                border:
                  activeNavId === "scenarios" || activeNavId === "docs"
                    ? "1px solid rgba(56,189,248,0.22)"
                    : "1px solid var(--orange-border)",
                transition:
                  "left 0.28s cubic-bezier(0.4,0,0.2,1), width 0.28s cubic-bezier(0.4,0,0.2,1)",
                pointerEvents: "none",
                zIndex: 0,
              }}
            />
          )}

          {navTabs.map((tab, index) => {
            const isActive = activeNavId === tab.id;
            const isScenarioTab = tab.id === "scenarios";
            const isDocsTab = tab.id === "docs";
            const isDisabled = Boolean(tab.disabled);

            const activeColor =
              isScenarioTab || isDocsTab ? "var(--blue)" : "var(--text-1)";

            return (
              <button
                key={tab.id}
                ref={(el) => { tabRefs.current[index] = el; }}
                type="button"
                onClick={() => handleTabClick(tab)}
                disabled={isDisabled}
                title={tab.tooltip}
                style={{
                  position: "relative",
                  zIndex: 1,
                  padding: "10px 22px",
                  border: "none",
                  background: "transparent",
                  color: isActive
                    ? activeColor
                    : isDisabled
                      ? "var(--text-3)"
                      : "var(--text-2)",
                  fontFamily: "var(--font-display)",
                  fontSize: "13px",
                  fontWeight: isActive ? 700 : 500,
                  cursor: isDisabled ? "not-allowed" : "pointer",
                  opacity: isDisabled && !isActive ? 0.5 : 1,
                  whiteSpace: "nowrap",
                  maxWidth: tab.id === "labs" ? "420px" : "none",
                  display: "flex",
                  alignItems: "center",
                  gap: "9px",
                  borderRadius: "8px",
                  transition: "color 0.2s, font-weight 0.2s",
                }}
              >
                {tab.label}
              </button>
            );
          })}
        </nav>

        {/* Right: tutor + account */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "flex-end",
            gap: "12px",
          }}
        >
          <RagTutorWidget
            labId={activeItem?.id}
            phase={activeItem?.phase}
            activeItem={activeItem}
            placement="topbar"
          />
          <AccountMenu
            user={user}
            isAdmin={isAdmin}
            onSelectItem={onSelectItem}
            logout={logout}
          />
        </div>
      </div>
    </header>
  );
}
