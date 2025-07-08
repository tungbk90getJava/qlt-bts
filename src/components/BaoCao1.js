// src/components/BaoCao1.js
import React, { useEffect, useState } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../firebase";
import { Link } from "react-router-dom";

export default function BaoCao1() {
  const [tramData, setTramData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const rowsPerPage = 10;

  useEffect(() => {
    const fetchData = async () => {
      // 1. Lấy dữ liệu từ 3 collection
      const [tramSnap, hdASnap, hdBSnap] = await Promise.all([
        getDocs(collection(db, "importTram")),
        getDocs(collection(db, "hdA")),
        getDocs(collection(db, "hdB")),
      ]);

      const tramDocs = tramSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      const hdAList = hdASnap.docs.map(doc => doc.data());
      const hdBList = hdBSnap.docs.map(doc => doc.data());

      // 2. Tạo map duy nhất theo "Tên trạm", đồng thời tính trạng thái thanh toán
      const uniqueTramMap = new Map();

      tramDocs.forEach((tram) => {
        const key = tram["Tên trạm"]?.trim();
        if (!key || uniqueTramMap.has(key)) return;

        // Lấy danh sách mã hợp đồng A/B
        const maHdA = tram["Mã hợp đồng A"];
        const maHdBs = tram["Mã hợp đồng B"]
          ? tram["Mã hợp đồng B"].split(",").map(s => s.trim())
          : [];

        // Tính trạng thái thanh toán chủ nhà
        const relatedHdA = hdAList.filter(hd => hd["Mã hợp đồng"] === maHdA);
        const allA_Paid = relatedHdA.length > 0 && relatedHdA.every(hd => hd["Trạng thái thanh toán"] === "Đã thanh toán");

        // Tính trạng thái thanh toán nhà mạng
        const relatedHdB = hdBList.filter(hd => maHdBs.includes(hd["Mã hợp đồng"]));
        const allB_Paid = relatedHdB.length > 0 && relatedHdB.every(hd => hd["Trạng thái thanh toán"] === "Đã thanh toán");

        uniqueTramMap.set(key, {
          ...tram,
          thanhToanChuNha: allA_Paid ? "Đã thanh toán" : "Chưa thanh toán",
          nhaMangThanhToan: allB_Paid ? "Đã thanh toán" : "Chưa thanh toán"
        });
      });

      // 3. Chuyển map thành mảng và sắp xếp ABC
      const uniqueData = Array.from(uniqueTramMap.values()).sort((a, b) =>
        (a["Tên trạm"] || "").localeCompare(b["Tên trạm"] || "")
      );

      setTramData(uniqueData);
      setLoading(false);
    };

    fetchData();
  }, []);

  // Lọc tìm kiếm
  const filteredData = tramData.filter((row) =>
    row["Tên trạm"]?.toLowerCase().includes(searchTerm.trim().toLowerCase())
  );

  // Phân trang
  const indexOfLastRow = currentPage * rowsPerPage;
  const indexOfFirstRow = indexOfLastRow - rowsPerPage;
  const currentRows = filteredData.slice(indexOfFirstRow, indexOfLastRow);
  const totalPages = Math.ceil(filteredData.length / rowsPerPage);

  const goToNextPage = () => {
    if (currentPage < totalPages) setCurrentPage(currentPage + 1);
  };
  const goToPrevPage = () => {
    if (currentPage > 1) setCurrentPage(currentPage - 1);
  };

  if (loading) return <div>Đang tải dữ liệu...</div>;

  return (
    <div style={{ padding: 20, backgroundColor: "#f2f2f2", minHeight: "100vh" }}>
      <h2 style={{ textAlign: "center" }}>BÁO CÁO TỔNG HỢP TRẠM VIỄN THÔNG</h2>

      <div style={{ marginBottom: 10, textAlign: "left" }}>
        <input
          type="text"
          placeholder="Tìm kiếm theo tên trạm..."
          value={searchTerm}
          onChange={(e) => {
            setSearchTerm(e.target.value);
            setCurrentPage(1);
          }}
          style={{ padding: 5, width: 300 }}
        />
      </div>

      <table
        style={{
          borderCollapse: "collapse",
          width: "100%",
          backgroundColor: "#fff",
        }}
      >
        <thead style={{ backgroundColor: "#ddd" }}>
          <tr>
            <th style={cellStyle}>STT</th>
            <th style={cellStyle}>Tên trạm</th>
            <th style={cellStyle}>Tọa độ</th>
            <th style={cellStyle}>Địa chỉ</th>
            <th style={cellStyle}>Số nhà mạng</th>
            <th style={cellStyle}>Thanh toán chủ nhà</th>
            <th style={cellStyle}>Nhà mạng thanh toán</th>
            <th style={cellStyle}>Chi tiết</th>
          </tr>
        </thead>
        <tbody>
          {currentRows.map((row, index) => (
            <tr key={row.id}>
              <td style={cellStyle}>{indexOfFirstRow + index + 1}</td>
              <td style={cellStyle}>{row["Tên trạm"]}</td>
              <td style={cellStyle}>{row["Tọa độ"]}</td>
              <td style={cellStyle}>{row["Địa chỉ"]}</td>
              <td style={cellStyle}>{row["Số nhà mạng"]}</td>
              <td style={cellStyle}>{row.thanhToanChuNha}</td>
              <td style={cellStyle}>{row.nhaMangThanhToan}</td>
              <td style={cellStyle}>
                <Link to={`/bao-cao-2/${encodeURIComponent(row["Tên trạm"])}`}>
                  Xem
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <div style={{ marginTop: 20, textAlign: "center" }}>
        <button onClick={goToPrevPage} disabled={currentPage === 1}>
          Back
        </button>
        <span style={{ margin: "0 10px" }}>
          Trang {currentPage}/{totalPages}
        </span>
        <button onClick={goToNextPage} disabled={currentPage === totalPages}>
          Next
        </button>
      </div>
    </div>
  );
}

const cellStyle = {
  border: "1px solid #999",
  textAlign: "center",
  padding: "8px",
};
