import { Loader } from "@/sidepanel/app/components/Loader"
import { useAppSettingsGet } from "@/sidepanel/queries/appSettings"

import { TitleGenerationSettingsForm } from "./components/TitleGenerationSettingsForm"
import s from "./TitleGenerationSettings.module.css"

export function TitleGenerationSettings() {
  const { data: appSettings, isLoading } = useAppSettingsGet()

  if (isLoading || !appSettings) {
    return (
      <div className={s.container}>
        <div className={s.header}>
          <h3 className={s.title}>Title Generation</h3>
        </div>
        <div className={s.loading}>
          <Loader size={13} /> Loading...
        </div>
      </div>
    )
  }

  return (
    <TitleGenerationSettingsForm
      key={appSettings.id}
      initialValue={appSettings.titleGenerationModel}
    />
  )
}
