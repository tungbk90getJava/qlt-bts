// src/App.js
import React from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import Login from "./components/Login";
import BaoCao1 from "./components/BaoCao1";
import BaoCao2 from "./components/BaoCao2";
import UploadExcel from "./components/UploadExcel";
import { auth } from "./firebase";
import { onAuthStateChanged } from "firebase/auth";

function PrivateRoute({ children }) {
  const [user, setUser] = React.useState(undefined);

  React.useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, setUser);
    return () => unsubscribe();
  }, []);

  if (user === undefined) return <p>Đang kiểm tra trạng thái đăng nhập...</p>;
  return user ? children : <Navigate to="/login" />;
}

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/upload" element={
          <PrivateRoute>
            <UploadExcel />
          </PrivateRoute>
        } />
        <Route path="/bao-cao-1" element={
          <PrivateRoute>
            <BaoCao1 />
          </PrivateRoute>
        } />
        <Route path="/bao-cao-2/:tenTram" element={
          <PrivateRoute>
            <BaoCao2 />
          </PrivateRoute>
        } />
        <Route path="*" element={<Navigate to="/login" />} />
      </Routes>
    </Router>
  );
}

export default App;
