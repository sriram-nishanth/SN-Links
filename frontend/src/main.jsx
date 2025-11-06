import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import { I18nextProvider } from 'react-i18next'
import i18n from './i18n' // Initialize i18n
import { UserProvider } from './Context/UserContext'
import { SocketProvider } from './Context/SocketContext'
import "./index.css";
import App from "./App.jsx";
import HomePage from "./Pages/HomePage.jsx";
import Profile from "./Pages/Profile.jsx";
import Setting from "./Pages/Setting.jsx";
import Chat from "./Pages/Chat.jsx";
import SignupPage from "./Pages/SignupPage.jsx";

const router = createBrowserRouter([
  { path: "/", element: <App /> },
  { path: "/signup", element: <SignupPage /> },
  { path: "/home", element: <HomePage /> },
  { path: "/profile/:userId", element: <Profile /> },
  { path: "/setting", element: <Setting /> },
  { path: "/chat", element: <Chat /> },
]);

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <I18nextProvider i18n={i18n}>
      <UserProvider>
        <SocketProvider>
          <RouterProvider router={router} />
        </SocketProvider>
      </UserProvider>
    </I18nextProvider>
  </StrictMode>
);
