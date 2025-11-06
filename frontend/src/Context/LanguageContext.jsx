// src/Context/LanguageContext.jsx
import React, { createContext, useContext, useState } from "react";

const LanguageContext = createContext();

const translations = {
  en: {
    search: "#Explore",
    home: "Home",
    profile: "Profile",
    chat: "Chat",
    settings: "Settings",
  },
  es: {
    search: "#Explorar",
    home: "Inicio",
    profile: "Perfil",
    chat: "Chat",
    settings: "Ajustes",
  },
  fr: {
    search: "#Explorer",
    home: "Accueil",
    profile: "Profil",
    chat: "Discussion",
    settings: "Paramètres",
  },
};

export const LanguageProvider = ({ children }) => {
  const [language, setLanguage] = useState("en");

  return (
    <LanguageContext.Provider
      value={{ language, setLanguage, translations }}
    >
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => useContext(LanguageContext);
