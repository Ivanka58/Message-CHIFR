import { createContext, useContext, useState } from "react";

export type Lang = "ru" | "en";

const translations = {
  ru: {
    langToggle: "English",
    slogan: "Безопасно. Анонимно. Без следов.",
    phoneLabel: "ВВЕДИТЕ НОМЕР ДОСТУПА",
    phonePlaceholder: "+7 (999) 000-0000",
    initiateBtn: "НАЧАТЬ СОЕДИНЕНИЕ",
    initiating: "ПОДКЛЮЧЕНИЕ...",
    codeLabel: "ВВЕДИТЕ КОД ПОДТВЕРЖДЕНИЯ",
    codeHint: "Перехваченный код:",
    verifyBtn: "УСТАНОВИТЬ ЗАЩИЩЁННЫЙ КАНАЛ",
    verifying: "ДЕШИФРОВКА...",
    searchPlaceholder: "Поиск в сети...",
    noMessages: "[ НЕТ ПРЕДЫДУЩИХ ЗАЩИЩЁННЫХ СООБЩЕНИЙ ]",
    transmitting: "...передача",
    messagePlaceholder: "Введите зашифрованное сообщение...",
    sendBtn: "ОТПРАВИТЬ",
    selectNode: "[ ВЫБЕРИТЕ УЗЕЛ ДЛЯ УСТАНОВКИ СВЯЗИ ]",
    e2e: "E2E ЗАШИФРОВАНО",
    navComms: "Чаты",
    navSettings: "Настройки",
    navNetwork: "Сеть",
    navDisconnect: "Выйти",
    settingsTitle: "Конфигурация системы",
    settingsSubtitle: "Управление безопасностью узла и протоколами доступа.",
    doubleBottomTitle: "Двойное дно",
    doubleBottomDesc: "Настройте двойные ключи шифрования. Хранится локально. Только демо.",
    primaryKey: "ОСНОВНОЙ КЛЮЧ ДЕШИФРОВАНИЯ",
    secondaryKey: "ВТОРИЧНЫЙ (СКРЫТЫЙ) КЛЮЧ ДЕШИФРОВАНИЯ",
    commitKeys: "СОХРАНИТЬ КЛЮЧИ",
    keysUpdated: "Ключи шифрования обновлены локально.",
    panicTitle: "Экстренная очистка",
    panicDesc: "Выполнение паник-последовательности немедленно уничтожит локальные данные сессии и разорвёт все активные соединения. Действие необратимо.",
    panicLabel: "ВВЕДИТЕ КОД АВТОРИЗАЦИИ ДЛЯ ОЧИСТКИ",
    panicPlaceholder: "напр. 0000",
    panicBtn: "ВЫПОЛНИТЬ ОЧИСТКУ",
    adminTitle: "Сетевой надзор",
    adminSubtitle: "Административный доступ к узлу",
    systemNominal: "СИСТЕМА В НОРМЕ",
    registeredNodes: "Зарегистрированные узлы",
    colIdName: "ID / Имя",
    colIdentifier: "Идентификатор",
    colComms: "Сообщений",
    noNodes: "УЗЛЫ НЕ ОБНАРУЖЕНЫ",
    interceptedTraffic: "Перехваченный трафик",
    route: "МАРШРУТ",
    noTraffic: "ТРАФИК НЕ ОБНАРУЖЕН",
  },
  en: {
    langToggle: "Русский",
    slogan: "Secure. Anonymous. Untraceable.",
    phoneLabel: "ENTER NODE ACCESS NUMBER",
    phonePlaceholder: "+1 (555) 000-0000",
    initiateBtn: "INITIATE HANDSHAKE",
    initiating: "CONNECTING...",
    codeLabel: "VERIFICATION MATRIX REQUIRED",
    codeHint: "Intercepted code:",
    verifyBtn: "ESTABLISH SECURE LINK",
    verifying: "DECRYPTING...",
    searchPlaceholder: "Scan network...",
    noMessages: "[ NO PREVIOUS SECURE COMMS DETECTED ]",
    transmitting: "...transmitting",
    messagePlaceholder: "Enter secure message...",
    sendBtn: "SEND",
    selectNode: "[ SELECT NODE TO ESTABLISH LINK ]",
    e2e: "E2E ENCRYPTED",
    navComms: "Comms",
    navSettings: "Settings",
    navNetwork: "Network",
    navDisconnect: "Disconnect",
    settingsTitle: "System Configuration",
    settingsSubtitle: "Manage node security and access protocols.",
    doubleBottomTitle: "Double Bottom",
    doubleBottomDesc: "Configure dual encryption keys. Stored locally. Feature demo only.",
    primaryKey: "PRIMARY DECRYPTION KEY",
    secondaryKey: "SECONDARY (HIDDEN) DECRYPTION KEY",
    commitKeys: "COMMIT KEYS TO STORAGE",
    keysUpdated: "Encryption keys updated locally.",
    panicTitle: "Emergency Purge",
    panicDesc: "Executing panic sequence will immediately destroy local session data and sever all active connections. This action cannot be reversed.",
    panicLabel: "ENTER AUTHORIZATION CODE TO PURGE",
    panicPlaceholder: "e.g. 0000",
    panicBtn: "EXECUTE PURGE",
    adminTitle: "Network Overwatch",
    adminSubtitle: "Administrative Node Access",
    systemNominal: "SYSTEM NOMINAL",
    registeredNodes: "Registered Nodes",
    colIdName: "ID / Name",
    colIdentifier: "Identifier",
    colComms: "Comms",
    noNodes: "NO NODES DETECTED",
    interceptedTraffic: "Intercepted Traffic",
    route: "ROUTE",
    noTraffic: "NO TRAFFIC DETECTED",
  },
} as const;

export type Translations = typeof translations.ru;

interface LangContextType {
  lang: Lang;
  t: Translations;
  toggleLang: () => void;
}

const LangContext = createContext<LangContextType | null>(null);

export function LangProvider({ children }: { children: React.ReactNode }) {
  const stored = (localStorage.getItem("shifr_lang") as Lang) || "ru";
  const [lang, setLang] = useState<Lang>(stored);

  const toggleLang = () => {
    const next: Lang = lang === "ru" ? "en" : "ru";
    setLang(next);
    localStorage.setItem("shifr_lang", next);
  };

  return (
    <LangContext.Provider value={{ lang, t: translations[lang], toggleLang }}>
      {children}
    </LangContext.Provider>
  );
}

export function useLang() {
  const ctx = useContext(LangContext);
  if (!ctx) throw new Error("useLang must be used inside LangProvider");
  return ctx;
}
