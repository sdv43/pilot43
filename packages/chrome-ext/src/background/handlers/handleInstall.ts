export function handleInstall() {
  chrome.sidePanel
    .setOptions({
      enabled: true,
      path: "sidepanel.html",
    })
    .catch((error) => {
      console.error("Error setting side panel options:", error)
    })

  chrome.sidePanel
    .setPanelBehavior({
      openPanelOnActionClick: true,
    })
    .catch((error) => {
      console.error("Error setting side panel behavior options:", error)
    })
}
