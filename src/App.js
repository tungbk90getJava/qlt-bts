import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import UploadExcel from "./components/UploadExcel";
import BaoCao1 from "./components/BaoCao1";
import BaoCao2 from "./components/BaoCao2"; // Có thể làm trống trước

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<UploadExcel />} />
        <Route path="/bao-cao-1" element={<BaoCao1 />} />
        <Route path="/bao-cao-2/:tenTram" element={<BaoCao2 />} />
      </Routes>
    </Router>
  );
}
