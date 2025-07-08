import React, { useState } from "react";
import * as XLSX from "xlsx";
import { db } from "../firebase";
import {
  collection,
  addDoc,
  deleteDoc,
  getDocs,
  doc,
} from "firebase/firestore";
import { Link } from "react-router-dom";
import { writeFile, utils } from "xlsx";

export default function UploadExcel() {
  const [message, setMessage] = useState("");

  const columnRules = {
    tram: {
      required: ["Tên trạm", "Mã hợp đồng A", "Mã hợp đồng B"],
      allowed: [
        "Tên trạm", "Tọa độ", "Địa chỉ", "Số nhà mạng",
        "Mã hợp đồng A", "Tên chủ nhà", "Số tài khoản chủ nhà",
        "Tên ngân hàng chủ nhà", "Địa chỉ chủ nhà", "Giá thuê/tháng với chủ nhà",
        "Ngày hợp đồng chủ nhà", "Loại hợp đồng chủ nhà (3 tháng, 6 tháng, 1 năm)",
        "Số tiền thanh toán với chủ nhà", "Mã hợp đồng B", "Nhà mạng",
        "Giá thuê/tháng với nhà mạng", "Ngày hợp đồng với nhà mạng",
        "Loại hợp đồng với nhà mạng (3 tháng, 6 tháng, 1 năm)",
        "Số tiền thanh toán với nhà mạng"
      ]
    },
    hdA: {
      required: ["Mã hợp đồng", "Kỳ thanh toán", "Số tiền thanh toán"],
      allowed: [
        "Mã hợp đồng", "Tên chủ nhà", "Số tài khoản ngân hàng", "Tên ngân hàng",
        "Địa chỉ", "Giá thuê/tháng", "Ngày hợp đồng",
        "Loại hợp đồng (3 tháng, 6 tháng, 1 năm)", "Kỳ thanh toán",
        "Ngày thanh toán", "Số tiền thanh toán", "Trạng thái thanh toán"
      ]
    },
    hdB: {
      required: ["Mã hợp đồng", "Nhà mạng", "Kỳ thanh toán", "Số tiền thanh toán"],
      allowed: [
        "TT", "Mã hợp đồng", "Nhà mạng", "Giá thuê/tháng", "Ngày hợp đồng",
        "Loại hợp đồng (3 tháng, 6 tháng, 1 năm)", "Kỳ thanh toán",
        "Ngày thanh toán", "Số tiền thanh toán", "Trạng thái thanh toán"
      ]
    }
  };

  const handleFileUpload = async (e, type) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (evt) => {
      const bstr = evt.target.result;
      const wb = XLSX.read(bstr, { type: "binary" });
      const sheetName = wb.SheetNames[0];
      const ws = wb.Sheets[sheetName];
      const data = XLSX.utils.sheet_to_json(ws);

      const colName =
        type === "tram" ? "importTram" : type === "hdA" ? "hdA" : type === "hdB" ? "hdB" : null;
      if (!colName || !data.length) return;

      const fileColumns = Object.keys(data[0] || {});
      const rules = columnRules[type];
      const missingCols = rules.required.filter(col => !fileColumns.includes(col));
    //  const unexpectedCols = fileColumns.filter(col => !rules.allowed.includes(col));

      if (missingCols.length > 0 ) {
        alert(`⚠️ File bạn chọn không đúng định dạng cho "${type}".\n` +
          (missingCols.length > 0 ? `❌ Thiếu cột: ${missingCols.join(", ")}\n` : "") 
        //  (unexpectedCols.length > 0 ? `❌ Có cột không mong muốn: ${unexpectedCols.join(", ")}` : "")
        );
        return;
      }

      let addedCount = 0;
      const existingSnapshot = await getDocs(collection(db, colName));
      const existingData = existingSnapshot.docs.map(doc => doc.data());

      for (let row of data) {
        let isDuplicate = false;

        if (type === "tram") {
          isDuplicate = existingData.some(
            (doc) =>
              doc["Tên trạm"] === row["Tên trạm"] &&
              doc["Mã hợp đồng A"] === row["Mã hợp đồng A"] &&
              doc["Mã hợp đồng B"] === row["Mã hợp đồng B"]
          );
        } else if (type === "hdA") {
          isDuplicate = existingData.some(
            (doc) => doc["Mã hợp đồng"] === row["Mã hợp đồng"] &&
                     doc["Kỳ thanh toán"] === row["Kỳ thanh toán"]
          );
        } else if (type === "hdB") {
          isDuplicate = existingData.some(
            (doc) => doc["Mã hợp đồng"] === row["Mã hợp đồng"] &&
                     doc["Kỳ thanh toán"] === row["Kỳ thanh toán"] &&
                     doc["Nhà mạng"] === row["Nhà mạng"]
          );
        }

        if (!isDuplicate) {
          await addDoc(collection(db, colName), row);
          addedCount++;
        }
      }

      setMessage(`✅ Đã thêm ${addedCount} bản ghi mới vào ${colName}`);
    };

    reader.readAsBinaryString(file);
  };

  const handleDeleteAll = async () => {
    const confirmDelete = window.confirm("Bạn có chắc chắn muốn xóa toàn bộ dữ liệu?");
    if (!confirmDelete) return;

    const collections = ["importTram", "hdA", "hdB"];
    for (let coll of collections) {
      const snapshot = await getDocs(collection(db, coll));
      const promises = snapshot.docs.map((docSnap) =>
        deleteDoc(doc(db, coll, docSnap.id))
      );
      await Promise.all(promises);
    }

    alert("✅ Đã xóa toàn bộ dữ liệu.");
    setMessage("");
  };

  const exportData = async (collectionName, fileName) =>  {
    const snapshot = await getDocs(collection(db, collectionName));
    const rawData = snapshot.docs.map((doc) => doc.data());

    let headers = [];

    if (collectionName === "importTram") {
      headers = columnRules.tram.allowed;
    } else if (collectionName === "hdA") {
      headers = columnRules.hdA.allowed;
    } else if (collectionName === "hdB") {
      headers = columnRules.hdB.allowed;
    }

    const formattedData = rawData.map((row) => {
      const newRow = {};
      headers.forEach((header) => {
        newRow[header] = row[header] ?? "";
      });
      return newRow;
    });

    const ws = utils.json_to_sheet(formattedData, { header: headers });
    const wb = utils.book_new();
    utils.book_append_sheet(wb, ws, "Sheet1");
    writeFile(wb, `${fileName}.xlsx`);
  };

  return (
    <div style={{ padding: 20 }}>
      <h2>🟢 Nhập dữ liệu trạm BTS</h2>

      <div style={{ marginBottom: 10 }}>
        <label>📁 Chọn file "import Trạm": </label>
        <input type="file" accept=".xlsx, .xls" onChange={(e) => handleFileUpload(e, "tram")} />
      </div>

      <div style={{ marginBottom: 10 }}>
        <label>📁 Chọn file "import hdA": </label>
        <input type="file" accept=".xlsx, .xls" onChange={(e) => handleFileUpload(e, "hdA")} />
      </div>

      <div style={{ marginBottom: 10 }}>
        <label>📁 Chọn file "import hdB": </label>
        <input type="file" accept=".xlsx, .xls" onChange={(e) => handleFileUpload(e, "hdB")} />
      </div>

      <button onClick={handleDeleteAll} style={{ marginRight: 10 }}>
        ❌ Delete All
      </button>

      <Link to="/bao-cao-1">
        <button>📊 Báo cáo Trạm</button>
      </Link>

      {message && <p style={{ marginTop: 20, color: "green" }}>{message}</p>}

      <div style={{ marginTop: 30 }}>
        <h4>⬇️ Export dữ liệu</h4>
        <button onClick={() => exportData("importTram", "Export_ImportTram")} style={{ marginRight: 10 }}>
          ⬇️ Export Trạm
        </button>
        <button onClick={() => exportData("hdA", "Export_hdA")} style={{ marginRight: 10 }}>
          ⬇️ Export Hợp đồng A
        </button>
        <button onClick={() => exportData("hdB", "Export_hdB")}>
          ⬇️ Export Hợp đồng B
        </button>
      </div>
    </div>
  );
}
