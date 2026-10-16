import s from "./App.module.css"
import { Chat, ChatList, Footer, Header, ToastProvider } from "./components"

export function App() {
  return (
    <div className={s.layout}>
      <Header className={s.header} />
      <div className={s.topTr}></div>
      <Chat className={s.chat} />
      <ChatList className={s.chatList} />
      <div className={s.bottomTr}></div>
      <Footer className={s.footer} />
      <ToastProvider />
    </div>
  )
}
