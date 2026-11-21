import { useEffect, useRef } from "react"
import { NavLink, Outlet, useLocation, useNavigate } from "react-router"

import { paths } from "../../../shared/routes"
import { PageHeader } from "../../components/PageHeader"
import { settingsTabs } from "./const"
import s from "./SettingsLayout.module.css"

/** `/settings/:tab` — Settings header with tabs above the active tab. */
export function SettingsLayout() {
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const tabsRef = useRef<HTMLElement>(null)

  // On a narrow panel the tabs scroll; keep the open tab in view.
  useEffect(() => {
    tabsRef.current
      ?.querySelector('[aria-current="page"]')
      ?.scrollIntoView?.({ block: "nearest", inline: "nearest" })
  }, [pathname])

  return (
    <div className={s.settingsLayout}>
      <PageHeader
        backLabel="Back to chat"
        title="Settings"
        onBack={() => void navigate(paths.home())}
      >
        <nav
          ref={tabsRef}
          aria-label="Settings sections"
          className={s.tabsWrapper}
        >
          <div className={s.tabs}>
            {settingsTabs.map(({ label, tab }) => (
              <NavLink
                key={tab}
                className={s.tab}
                data-testid={`settings-tab-${tab}`}
                to={paths.settings(tab)}
              >
                {label}
              </NavLink>
            ))}
          </div>
        </nav>
      </PageHeader>
      <main className={s.content}>
        <Outlet />
      </main>
    </div>
  )
}
