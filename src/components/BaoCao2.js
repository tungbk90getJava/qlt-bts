import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { getDocs, collection, deleteDoc, doc, addDoc, updateDoc, query, where, getCountFromServer,FieldPath } from "firebase/firestore";
import { db } from "../firebase";
import * as XLSX from "xlsx";

export default function BaoCao2() {
  const { tenTram } = useParams();
//
const [filterNetwork, setFilterNetwork] = useState("");
const [filterKyThanhToan, setFilterKyThanhToan] = useState("");
//

  const [tramList, setTramList] = useState([]);
  const [tramInfo, setTramInfo] = useState(null);
  const [hdAData, setHdAData] = useState([]);
  const [hdBData, setHdBData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editRowId, setEditRowId] = useState(null);
  const [editValues, setEditValues] = useState({});
  const [editAId, setEditAId] = useState(null);
const [editAValues, setEditAValues] = useState({});
  const formatCurrency = (value) =>
    value ? parseFloat(value).toLocaleString("vi-VN") : "";

  const formatDate = (input) => {
    if (!input) return "";

    if (typeof input === "number") {
      const excelEpoch = new Date(1900, 0, 1);
      const corrected = new Date(excelEpoch.getTime() + (input - 2) * 86400000);
      return corrected.toLocaleDateString("vi-VN");
    }

    if (typeof input === "object" && input.seconds) {
      return new Date(input.seconds * 1000).toLocaleDateString("vi-VN");
    }

    const date = new Date(input);
    if (!isNaN(date)) return date.toLocaleDateString("vi-VN");

    return "";
  };

  useEffect(() => {
    const fetchAllData = async () => {
      try {
        const [tramSnap, hdASnap, hdBSnap] = await Promise.all([
          getDocs(collection(db, "importTram")),
          getDocs(collection(db, "hdA")),
          getDocs(collection(db, "hdB")),
        ]);


        const tramData = tramSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        const trams = tramData.filter(item => item["Tên trạm"] === tenTram);
        setTramList(trams);
        setTramInfo(trams[0] || null); // Lấy dòng đầu làm hiển thị thông tin trạm

        if (trams.length === 0) {
          setLoading(false);
          return;
        }

        const hdAList = hdASnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        const hdBList = hdBSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        const maHopDongA = trams[0]["Mã hợp đồng A"];
        const hdAFiltered = hdAList.filter(
          (hd, idx, self) =>
            hd["Mã hợp đồng"] === maHopDongA &&
            idx === self.findIndex(
              d =>
                d["Mã hợp đồng"] === hd["Mã hợp đồng"] &&
                d["Nhà mạng"] === hd["Nhà mạng"] &&
                d["Kỳ thanh toán"] === hd["Kỳ thanh toán"]
            )
        );

        const maHopDongBs = trams.map(t => t["Mã hợp đồng B"]);
        const hdBFiltered = hdBList.filter(hd => maHopDongBs.includes(hd["Mã hợp đồng"]));

        setHdAData(hdAFiltered);
        setHdBData(hdBFiltered);
        setLoading(false);
      } catch (error) {
        console.error("Lỗi khi tải dữ liệu:", error);
        setLoading(false);
      }
    };

    fetchAllData();
  }, [tenTram]);
//them
  function startEdit(row) {
    setEditRowId(row.id ?? "__new__");
    setEditValues({
      ...row,
      "Ngày thanh toán": row["Ngày thanh toán"]
        ? new Date(row["Ngày thanh toán"]).toISOString().slice(0, 10)
        : "",
    });
  }

  function cancelEdit() {
    if (editRowId === "__new__") {
      setHdBData((old) => old.filter((r) => r.id != null));
    }
    setEditRowId(null);
    setEditValues({});
  }

  async function saveEdit() {
    const { id, "Mã hợp đồng": code, "Kỳ thanh toán": ky, ...rest } = editValues;

    const q = query(
      collection(db, "hdB"),
      where("Mã hợp đồng", "==", code),
      where("Kỳ thanh toán", "==", ky)
    );

    const snap = await getCountFromServer(q);
    const dup = snap.data().count - (id ? 1 : 0);
    if (dup > 0) {
      alert("Trùng Mã hợp đồng và Kỳ thanh toán, không lưu được.");
      return;
    }

    const payload = {
      ...rest,
      "Mã hợp đồng": code,
      "Kỳ thanh toán": ky,
      "Ngày thanh toán": new Date(editValues["Ngày thanh toán"]).toISOString(),
    };

    if (id) {
      await updateDoc(doc(db, "hdB", id), payload);
      setHdBData((old) => old.map((r) => (r.id === id ? { id, ...payload } : r)));
    } else {
      const ref = await addDoc(collection(db, "hdB"), payload);
      setHdBData((old) =>
        old.map((r) => (r.id == null ? { id: ref.id, ...payload } : r))
      );
    }

    setEditRowId(null);
    setEditValues({});
  }

  async function handleDelete(id) {
    if (!window.confirm("Xác nhận xóa?")) return;
    await deleteDoc(doc(db, "hdB", id));
    setHdBData((old) => old.filter((r) => r.id !== id));
  }

  function handleCopy(row) {
    const copy = { ...row, id: null };
    setHdBData((old) => [...old, copy]);
    startEdit(copy);
  }
//ket thuc B
function startEditA(row) {
    setEditAId(row.id ?? "__newA__");
    setEditAValues({
      ...row,
      "Ngày thanh toán": row["Ngày thanh toán"]
        ? new Date(row["Ngày thanh toán"]).toISOString().slice(0, 10)
        : "",
    });
  }

  function cancelEditA() {
    if (editAId === "__newA__") {
      setHdAData((old) => old.filter((r) => r.id != null));
    }
    setEditAId(null);
    setEditAValues({});
  }

  async function saveEditA() {
     const { id, "Mã hợp đồng": code, "Kỳ thanh toán": ky, ...rest } = editAValues;

  // 1. Kiểm tra trùng
  const qA = query(
    collection(db, "hdA"),
    where("Mã hợp đồng", "==", code),
    where("Kỳ thanh toán", "==", ky)
  );
  const snapA = await getCountFromServer(qA);
  const dupA = snapA.data().count - (id ? 1 : 0);
  if (dupA > 0) {
    return alert("Trùng Mã hợp đồng và Kỳ thanh toán (A).");
  }

  // 2. Chuẩn bị cập nhật
  const docRef = doc(db, "hdA", id);
  // Dùng tuple‑signature cho FieldPath
  const updates = [];
  // Mã hợp đồng và Kỳ thanh toán
  updates.push(new FieldPath("Mã hợp đồng"), code);
  updates.push(new FieldPath("Kỳ thanh toán"), ky);
  // Ngày thanh toán
  updates.push(
    new FieldPath("Ngày thanh toán"),
    rest["Ngày thanh toán"]
      ? new Date(rest["Ngày thanh toán"]).toISOString()
      : null
  );
  // Phần còn lại từ rest
  Object.entries(rest).forEach(([key, val]) => {
    if (key === "Ngày thanh toán") return; // đã thêm
    updates.push(new FieldPath(key), val);
  });

  // 3. Ghi lên Firestore
  await updateDoc(docRef, ...updates);

  // 4. Tái tải hdAData từ Firestore
  const allA = await getDocs(collection(db, "hdA"));
  // Lọc chỉ hợp đồng của trạm hiện tại
  const maA = tramInfo["Mã hợp đồng A"];
  const newHdA = allA.docs
    .map(d => ({ id: d.id, ...d.data() }))
    .filter(hd => hd["Mã hợp đồng"] === maA);
  setHdAData(newHdA);

  // 5. Reset edit state
  setEditAId(null);
  setEditAValues({});
  }

  async function handleDeleteA(id) {
    if (!window.confirm("Xác nhận xóa (A)?")) return;
    await deleteDoc(doc(db, "hdA", id));
    setHdAData((old) => old.filter((r) => r.id !== id));
  }

  function handleCopyA(row) {
    const copyA = { ...row, id: null };
    setHdAData((old) => [...old, copyA]);
    startEditA(copyA);
  }

//them


  const exportExcel = (data, sheetName, type) => {
    let formattedData = [];

    if (type === "hdA") {
      formattedData = data.map((hd, index) => ({
        "STT": index + 1,
        "Mã hợp đồng": tramInfo["Mã hợp đồng A"],
        "Tên chủ nhà": tramInfo["Tên chủ nhà"],
        "Số tài khoản": tramInfo["Số tài khoản chủ nhà"],
        "Tên ngân hàng": tramInfo["Tên ngân hàng chủ nhà"],
        "Địa chỉ": tramInfo["Địa chỉ chủ nhà"],
        "Giá thuê/tháng": formatCurrency(tramInfo["Giá thuê/tháng với chủ nhà"]),
        "Ngày hợp đồng": formatDate(tramInfo["Ngày hợp đồng chủ nhà"]),
        "Loại hợp đồng": tramInfo["Loại hợp đồng chủ nhà (3 tháng, 6 tháng, 1 năm)"],
        "Kỳ thanh toán": hd["Kỳ thanh toán"],
        "Ngày thanh toán": formatDate(hd["Ngày thanh toán"]),
        "Số tiền thanh toán": formatCurrency(hd["Số tiền thanh toán"]),
        "Trạng thái thanh toán": hd["Trạng thái thanh toán"]
      }));
    }

    if (type === "hdB") {
      formattedData = data.map((hd, index) => ({
        "STT": index + 1,
        "Mã hợp đồng": hd["Mã hợp đồng"],
        "Nhà mạng": hd["Nhà mạng"],
        "Giá thuê/tháng": formatCurrency(hd["Giá thuê/tháng"]),
        "Ngày hợp đồng": formatDate(hd["Ngày hợp đồng"]),
        "Loại hợp đồng": hd["Loại hợp đồng (3 tháng, 6 tháng, 1 năm)"],
        "Kỳ thanh toán": hd["Kỳ thanh toán"],
        "Ngày thanh toán": formatDate(hd["Ngày thanh toán"]),
        "Số tiền thanh toán": formatCurrency(hd["Số tiền thanh toán"]),
        "Trạng thái thanh toán": hd["Trạng thái thanh toán"]
      }));
    }

    const ws = XLSX.utils.json_to_sheet(formattedData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, sheetName);
    XLSX.writeFile(wb, `${sheetName}_${tenTram}.xlsx`);
  };

  if (loading) return <p>Đang tải dữ liệu...</p>;
  if (!tramInfo) return <p>Không tìm thấy trạm.</p>;
const filteredHdBData = hdBData
  .filter(hd =>
    (filterNetwork === "" || hd["Nhà mạng"] === filterNetwork) &&
    (filterKyThanhToan === "" || hd["Kỳ thanh toán"] === filterKyThanhToan)
  )
  .sort((a, b) => a["Kỳ thanh toán"]?.localeCompare(b["Kỳ thanh toán"]));
  return (
    <div style={{ padding: 20 }}>
      <h2 style={{ textAlign: "center" }}>CHI TIẾT TRẠM: {tenTram}</h2>

      {/* Thông tin trạm */}
      <table border="1" cellPadding={5} style={{ marginBottom: 20 }}>
        <tbody>
          <tr>
            <td><strong>Tên trạm</strong></td>
            <td>{tramInfo["Tên trạm"]}</td>
          </tr>
          <tr>
            <td><strong>Tọa độ</strong></td>
            <td>{tramInfo["Tọa độ"]}</td>
          </tr>
          <tr>
            <td><strong>Địa chỉ</strong></td>
            <td>{tramInfo["Địa chỉ"]}</td>
          </tr>
        </tbody>
      </table>

      {/* Hợp đồng A */}
      <h3>I. Hợp đồng giữa Chủ nhà và Công ty</h3>
      <button onClick={() => exportExcel(hdAData, "HopDongA", "hdA")}>📥 Export HĐ A</button>
      <table border="1" cellPadding={5} width="100%" style={{ marginTop: 10 }}>
        <thead style={{ backgroundColor: "#eee" }}>
          <tr>
            <th>TT</th>
            <th>Mã hợp đồng</th>
            <th>Tên chủ nhà</th>
            <th>Số tài khoản</th>
            <th>Tên ngân hàng</th>
            <th>Địa chỉ</th>
            <th>Giá thuê/tháng</th>
            <th>Ngày hợp đồng</th>
            <th>Loại hợp đồng</th>
            <th>Kỳ thanh toán</th>
            <th>Ngày thanh toán</th>
            <th>Số tiền thanh toán</th>
            <th>Trạng thái thanh toán</th>
         
          </tr>
        </thead>
        <tbody>
       {
       [...hdAData]
    .sort((a, b) => a["Kỳ thanh toán"]?.localeCompare(b["Kỳ thanh toán"]))
    .map((hd, index) => (
      <tr key={hd.id || `newA-${index}`}>
        <td>{index + 1}</td>
        {editAId === (hd.id ?? "__newA__") ? (
          <>
            {/* ... các ô input sửa như bạn đang dùng */}
          </>
        ) : (
          <>
            <td>{tramInfo["Mã hợp đồng A"]}</td>
            <td>{tramInfo["Tên chủ nhà"]}</td>
            <td>{tramInfo["Số tài khoản chủ nhà"]}</td>
            <td>{tramInfo["Tên ngân hàng chủ nhà"]}</td>
            <td>{tramInfo["Địa chỉ chủ nhà"]}</td>
            <td>{formatCurrency(tramInfo["Giá thuê/tháng với chủ nhà"])}</td>
            <td>{formatDate(tramInfo["Ngày hợp đồng chủ nhà"])}</td>
            <td>{tramInfo["Loại hợp đồng chủ nhà (3 tháng, 6 tháng, 1 năm)"]}</td>
            <td>{hd["Kỳ thanh toán"]}</td>
            <td>{formatDate(hd["Ngày thanh toán"])}</td>
            <td>{formatCurrency(hd["Số tiền thanh toán"])}</td>
            <td>{hd["Trạng thái thanh toán"]}</td>
          </>
        )}
      </tr>
    ))}
        </tbody>
      </table>



      {/* Hợp đồng B */}
      <h3 style={{ marginTop: 40 }}>II. Hợp đồng giữa Công ty và Nhà mạng</h3>

<div style={{ marginTop: 10, marginBottom: 10 }}>
  <label style={{ marginRight: 10 }}>
    🏢 Chọn Nhà mạng:{" "}
    <select value={filterNetwork} onChange={(e) => setFilterNetwork(e.target.value)}>
      <option value="">-- Tất cả --</option>
      {[...new Set(hdBData.map(h => h["Nhà mạng"]))].map((nm, idx) => (
        <option key={idx} value={nm}>{nm}</option>
      ))}
    </select>
  </label>

  <label>
    📆 Kỳ thanh toán:{" "}
    <select value={filterKyThanhToan} onChange={(e) => setFilterKyThanhToan(e.target.value)}>
      <option value="">-- Tất cả --</option>
      {[...new Set(hdBData.map(h => h["Kỳ thanh toán"]))].sort().map((ky, idx) => (
        <option key={idx} value={ky}>{ky}</option>
      ))}
    </select>
  </label>
</div>

      <button onClick={() => exportExcel(hdBData, "HopDongB", "hdB")}>📥 Export HĐ B</button>
      <div style={{ overflowX: "auto", marginTop: 10 }}>
        <table border="1" cellPadding={5} width="100%">
          <thead style={{ backgroundColor: "#eee" }}>
            <tr>
              <th>TT</th>
              <th>Mã hợp đồng</th>
              <th>Nhà mạng</th>
              <th>Giá thuê/tháng</th>
              <th>Ngày hợp đồng</th>
              <th>Loại hợp đồng</th>
              <th>Kỳ thanh toán</th>
              <th>Ngày thanh toán</th>
              <th>Số tiền thanh toán</th>
              <th>Trạng thái thanh toán</th>
            
            </tr>
          </thead>
          <tbody>
            
            {filteredHdBData.map((hd, index) => (
    <tr key={hd.id}>
      <td>{index + 1}</td>
      <td>{hd["Mã hợp đồng"]}</td>
      <td>{hd["Nhà mạng"]}</td>
      <td>{formatCurrency(hd["Giá thuê/tháng"])}</td>
      <td>{formatDate(hd["Ngày hợp đồng"])}</td>
      <td>{hd["Loại hợp đồng (3 tháng, 6 tháng, 1 năm)"]}</td>
      <td>{hd["Kỳ thanh toán"]}</td>
      <td>{formatDate(hd["Ngày thanh toán"])}</td>
      <td>{formatCurrency(hd["Số tiền thanh toán"])}</td>
      <td>{hd["Trạng thái thanh toán"]}</td>
    </tr>
  ))}

  {/* Dòng tổng */}
  <tr>
    <td colSpan="8" style={{ textAlign: "right" }}><strong>Tổng</strong></td>
    <td>
      <strong>
        {formatCurrency(
          filteredHdBData.reduce(
            (sum, row) => sum + parseFloat(row["Số tiền thanh toán"] || 0),
            0
          )
        )}
      </strong>
    </td>
    <td></td>
  </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
